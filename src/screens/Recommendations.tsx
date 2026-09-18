import { useMemo, useState } from 'react';
import { fetchAdvice, type AdviceResult } from '../ai';
import { BandBadge, Button, Chip, DemoNote, Icon, Meter, PageHead, ScoreRing, SourceLink } from '../components/ui';
import { COUNTRY_FLAG, COUNTRY_LABELS, FIELD_LABELS } from '../data/options';
import { PROGRAMS } from '../data/programs';
import { plural, usd } from '../engine/format';
import { recommend, relaxHints } from '../engine/recommend';
import { leversFor } from '../engine/leverage';
import { Levers } from './Levers';
import { go } from '../router';
import { useStore } from '../state/store';
import type { CountryCode, Field, Recommendation } from '../types';

const nameOf = (id: string) => {
  const p = PROGRAMS.find((x) => x.id === id);
  return p ? `${p.university} (${p.program.split(" (")[0]})` : id;
};

export function Recommendations() {
  const { state, dispatch, derived } = useStore();
  const { top, eligible, exclusions } = derived.recs;
  const [showAll, setShowAll] = useState(false);

  // В режиме примерки список обязан визуально измениться, иначе эффект рычага не виден.
  // Считаем, каких программ не было в настоящем профиле, и поднимаем их в начало.
  const unlockedIds = useMemo(() => {
    if (!state.preview) return new Set<string>();
    const base = new Set(recommend(state.profile).eligible.map((r) => r.program.id));
    return new Set(eligible.filter((r) => !base.has(r.program.id)).map((r) => r.program.id));
  }, [state.preview, state.profile, eligible]);

  const baseList = showAll ? eligible : top;
  const list = unlockedIds.size === 0
    ? baseList
    : [
        ...eligible.filter((r) => unlockedIds.has(r.program.id)),
        ...baseList.filter((r) => !unlockedIds.has(r.program.id)),
      ];
  const hints = eligible.length < 3 ? relaxHints(state.profile) : [];

  return (
    <div className="stack">
      <PageHead eyebrow="Этап 4 · Рекомендации" title="Программы, которые вам подходят">
        Отсортированы по совпадению с профилем. Отметьте «В план» то, куда будете подавать — из этого соберётся маршрут.
      </PageHead>

      {state.change && (
        <div className="change-banner" role="status">
          <Icon name="refresh" />
          <div>
            <b>Рекомендации обновились после изменения анкеты</b>
            <p className="small">
              {state.change.added.length > 0 && <>Добавлены: {state.change.added.map(nameOf).join(', ')}. </>}
              {state.change.removed.length > 0 && <>Убраны: {state.change.removed.map(nameOf).join(', ')}.</>}
            </p>
          </div>
          <button className="icon-btn" aria-label="Скрыть" onClick={() => dispatch({ type: 'dismissChange' })}><Icon name="close" size={18} /></button>
        </div>
      )}

      <PreviewBanner />

      <WhatIf />

      {eligible.length === 0 ? (
        <section className="card empty">
          <Icon name="warn" size={32} />
          <h2>По этим условиям подходящих программ нет</h2>
          <p className="muted">Это не значит, что поступить нельзя, — просто в нашей базе нет вариантов под такое сочетание.</p>
          <ul className="bullet-list">{hints.map((h) => <li key={h}>{h}</li>)}</ul>
          <Button icon="edit" onClick={() => go('profile/4')}>Изменить условия</Button>
        </section>
      ) : (
        <>
          {eligible.length < 3 && (
            <div className="notice"><Icon name="info" /> <span>Нашлось мало вариантов. {hints.join('. ')}</span></div>
          )}
          <div className="rec-list">
            {list.map((r, i) => <RecCard key={r.program.id} r={r} rank={i + 1} unlocked={unlockedIds.has(r.program.id)} />)}
          </div>
          {eligible.length > top.length && (
            <Button variant="ghost" onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Показать только лучшие' : `Показать все подходящие (${eligible.length})`}
            </Button>
          )}
        </>
      )}

      {eligible.length > 0 && <Levers />}

      {exclusions.length > 0 && (
        <details className="card excluded">
          <summary>
            Почему не показаны ещё {exclusions.length} {plural(exclusions.length, 'программа', 'программы', 'программ')} по вашему направлению
          </summary>
          <ul>
            {exclusions.map((e) => (
              <li key={e.program.id}>
                <b>{e.program.university}</b> · {e.program.program} — <span className="muted">{e.reason}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className={`sticky-bar${state.shortlist.length || state.compare.length ? ' show' : ''}`}>
        <span className="small">
          В плане: <b>{state.shortlist.length}</b> · к сравнению: <b>{state.compare.length}</b>
        </span>
        <div className="sticky-actions">
          <Button small variant="secondary" icon="compare" disabled={state.compare.length < 2} onClick={() => go('compare')}>
            Сравнить
          </Button>
          <Button small iconRight="arrow" disabled={state.shortlist.length === 0} onClick={() => go('plan')}>
            К плану
          </Button>
        </div>
      </div>
    </div>
  );
}

function RecCard({ r, rank, unlocked = false }: { r: Recommendation; rank: number; unlocked?: boolean }) {
  const { state, dispatch } = useStore();
  const [open, setOpen] = useState(rank === 1);
  const [advice, setAdvice] = useState<AdviceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const inPlan = state.shortlist.includes(r.program.id);
  const inCompare = state.compare.includes(r.program.id);
  const p = r.program;
  const withGrant = state.profile.needGrant && p.grant !== 'none';

  const ask = async () => {
    setLoading(true);
    setAdvice(await fetchAdvice(state.profile, r));
    setLoading(false);
  };

  return (
    <article className={`card rec${inPlan ? ' rec-in-plan' : ''}${unlocked ? ' rec-unlocked' : ''}`}>
      {unlocked && (
        <p className="rec-unlocked-flag"><Icon name="spark" size={14} /> Открылось благодаря примеряемому изменению</p>
      )}
      <div className="rec-head">
        <ScoreRing score={r.score} />
        <div className="rec-title">
          <div className="rec-badges">
            <BandBadge band={r.band} />
            {p.grant === 'full' && <span className="tag tag-good">Грант / стипендия</span>}
          </div>
          <h2>{p.university}</h2>
          <p className="muted">{p.program}</p>
          <p className="small">{COUNTRY_FLAG[p.country]} {p.city}, {COUNTRY_LABELS[p.country]} · {p.language.map((l) => l.toUpperCase()).join(' / ')}</p>
        </div>
      </div>

      <div className="rec-facts">
        <div>
          <span className="small muted">{withGrant ? 'С грантом, в год' : 'Расходы в год'}</span>
          <b>≈{usd(withGrant ? r.costWithGrantUSD : r.yearlyCostUSD)}</b>
        </div>
        <div>
          <span className="small muted">Подача</span>
          <b className="small">{p.deadline.label}</b>
        </div>
        <DemoNote />
        <SourceLink href={p.sourceUrl} label="Проверить на сайте вуза" strong />
      </div>

      <ul className="reason-list">
        {r.reasons.slice(0, open ? undefined : 3).map((x) => (
          <li key={x.text} className={`r-${x.kind}`}>
            <Icon name={x.kind === 'plus' ? 'check' : x.kind === 'minus' ? 'warn' : 'info'} size={16} /> {x.text}
          </li>
        ))}
      </ul>

      {open && (
        <div className="rec-details">
          <div className="breakdown">
            <p className="eyebrow">Из чего сложилась оценка {r.score}/100</p>
            {r.breakdown.map((b) => (
              <div key={b.label} className="breakdown-row">
                <span className="small">{b.label}</span>
                <Meter value={b.value} max={b.max} tone={b.value / b.max >= 0.7 ? 'good' : b.value / b.max >= 0.4 ? 'primary' : 'warn'} />
                <span className="small num">{b.value}/{b.max}</span>
              </div>
            ))}
          </div>
          {r.gaps.length > 0 && (
            <div>
              <p className="eyebrow">Что подтянуть</p>
              <ul className="bullet-list">{r.gaps.map((g) => <li key={g}>{g}</li>)}</ul>
            </div>
          )}
          <p className="small"><b>Как поступают:</b> {p.entrance}</p>
          <div className="tags">{p.highlights.map((h) => <span key={h} className="tag">{h}</span>)}</div>
          <p className="small muted">
            Направления: {p.fields.map((f: Field) => FIELD_LABELS[f]).join(', ')}. Стоимость и дедлайн сверены с сайтом вуза —
            проверьте по ссылке перед подачей.
          </p>
          <div className="advice">
            {!advice && (
              <Button variant="secondary" small icon="spark" onClick={ask} disabled={loading}>
                {loading ? 'Готовим разбор…' : 'Персональный разбор от AI'}
              </Button>
            )}
            {advice && (
              <div className="advice-box">
                <p className="eyebrow">
                  <Icon name="spark" size={14} /> {advice.source === 'ai' ? 'AI-разбор' : 'Разбор по правилам (AI сейчас недоступен)'}
                </p>
                {advice.text.split('\n\n').map((t) => <p key={t}>{t}</p>)}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rec-actions">
        <Button small variant={inPlan ? 'primary' : 'secondary'} icon={inPlan ? 'check' : 'plus'} pressed={inPlan} onClick={() => dispatch({ type: 'toggleShortlist', id: p.id })}>
          {inPlan ? 'В плане' : 'В план'}
        </Button>
        <Button small variant={inCompare ? 'primary' : 'ghost'} icon="compare" pressed={inCompare} onClick={() => dispatch({ type: 'toggleCompare', id: p.id })}>
          {inCompare ? 'Сравниваю' : 'Сравнить'}
        </Button>
        <Button small variant="ghost" onClick={() => setOpen((o) => !o)}>{open ? 'Свернуть' : 'Почему подходит'}</Button>
      </div>
    </article>
  );
}

/** Quick "what if" controls: change key answers and see recommendations react immediately. */
/** Пока включена примерка, список на экране — гипотеза, и это должно быть видно всегда. */
function PreviewBanner() {
  const { state, dispatch, derived } = useStore();
  if (!state.preview) return null;
  const lever = leversFor(state.profile).find((l) => l.id === state.preview);
  if (!lever) return null;

  return (
    <div className="preview-banner" role="status">
      <Icon name="spark" />
      <div>
        <b>Примерка: {lever.title}</b>
        <p className="small">
          Так список выглядел бы после этого изменения — {derived.recs.eligible.length} подходящих вариантов.
          Ваш профиль не изменён.
        </p>
      </div>
      <div className="preview-banner-actions">
        <Button small variant="accent" onClick={() => dispatch({ type: 'applyLever', id: lever.id })}>Взять целью</Button>
        <Button small variant="ghost" onClick={() => dispatch({ type: 'previewLever', id: null })}>Вернуть</Button>
      </div>
    </div>
  );
}

function WhatIf() {
  const { state, dispatch } = useStore();
  const p = state.profile;
  const [open, setOpen] = useState(false);
  const [budget, setBudget] = useState(p.budgetUSD);
  const save = (patch: Partial<typeof p>) => dispatch({ type: 'saveProfile', profile: { ...p, ...patch } });

  return (
    <section className={`card whatif${open ? ' open' : ''}`}>
      <button className="whatif-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Icon name="edit" size={18} />
        <span>
          <b>Что если?</b> <span className="muted small">Бюджет {usd(p.budgetUSD)} · {p.interests.map((f) => FIELD_LABELS[f]).join(', ')} · {p.countries.length ? p.countries.map((c) => COUNTRY_FLAG[c]).join(' ') : 'все страны'}</span>
        </span>
        <span className="whatif-chevron" aria-hidden>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="whatif-body">
          <label className="field">
            <span className="label">Бюджет в год: <b>{usd(budget)}</b></span>
            <input type="range" min={0} max={50000} step={500} value={budget} onChange={(e) => setBudget(Number(e.target.value))} onPointerUp={() => save({ budgetUSD: budget })} onKeyUp={() => save({ budgetUSD: budget })} />
          </label>
          <div className="field">
            <span className="label">Главный интерес</span>
            <div className="chips">
              {(Object.keys(FIELD_LABELS) as Field[]).map((f) => (
                <Chip key={f} selected={p.interests[0] === f} onClick={() => save({ interests: [f, ...p.interests.filter((x) => x !== f)].slice(0, 3) })}>
                  {FIELD_LABELS[f]}
                </Chip>
              ))}
            </div>
          </div>
          <div className="field">
            <span className="label">Страны</span>
            <div className="chips">
              <Chip selected={p.countries.length === 0} onClick={() => save({ countries: [] })}>Любая</Chip>
              {(Object.keys(COUNTRY_LABELS) as CountryCode[]).map((c) => (
                <Chip key={c} selected={p.countries.includes(c)} onClick={() => save({ countries: p.countries.includes(c) ? p.countries.filter((x) => x !== c) : [...p.countries, c] })}>
                  {COUNTRY_FLAG[c]} {COUNTRY_LABELS[c]}
                </Chip>
              ))}
            </div>
          </div>
          <div className="field-row">
            <label className="field">
              <span className="label">IELTS</span>
              <select value={p.ielts ?? ''} onChange={(e) => save({ ielts: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Нет</option>
                {[4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="label">Ожидаемый ЕНТ</span>
              <select value={p.untExpected ?? ''} onChange={(e) => save({ untExpected: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Не знаю</option>
                {[60, 70, 80, 90, 100, 110, 120, 130].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
          </div>
          <Button small variant="ghost" icon="edit" onClick={() => go('profile')}>Вся анкета</Button>
        </div>
      )}
    </section>
  );
}
