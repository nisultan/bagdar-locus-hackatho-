import { useMemo, useState } from 'react';
import { fetchAdvice, type AdviceResult } from '../ai';
import { BandBadge, Button, Chip, CountryTag, EstimateNote, Icon, Meter, PageHead, ScoreRing, SourceLink, UniCover } from '../components/ui';
import { COUNTRY_FLAG, COUNTRY_LABELS, FIELD_LABELS } from '../data/options';
import { PROGRAMS } from '../data/programs';
import { usd } from '../engine/format';
import { recommend, relaxHints } from '../engine/recommend';
import { leversFor } from '../engine/leverage';
import { plural, t } from '../i18n';
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
      <PageHead eyebrow={t('rc.eyebrow')} title={t('rc.title')}>
        {t('rc.lead')}
      </PageHead>

      {state.change && (
        <div className="change-banner" role="status">
          <Icon name="refresh" />
          <div>
            <b>{t('rc.changed')}</b>
            <p className="small">
              {state.change.added.length > 0 && <>{t('rc.added', { list: state.change.added.map(nameOf).join(', ') })}</>}
              {state.change.removed.length > 0 && <>{t('rc.removed', { list: state.change.removed.map(nameOf).join(', ') })}</>}
            </p>
          </div>
          <button className="icon-btn" aria-label={t('rc.hide')} onClick={() => dispatch({ type: 'dismissChange' })}><Icon name="close" size={18} /></button>
        </div>
      )}

      <PreviewBanner />

      <WhatIf />

      {eligible.length === 0 ? (
        <section className="card empty">
          <Icon name="warn" size={32} />
          <h2>{t('rc.emptyTitle')}</h2>
          <p className="muted">{t('rc.emptyText')}</p>
          <ul className="bullet-list">{hints.map((h) => <li key={h}>{h}</li>)}</ul>
          <Button icon="edit" onClick={() => go('profile/4')}>{t('rc.emptyCta')}</Button>
        </section>
      ) : (
        <>
          {eligible.length < 3 && (
            <div className="notice"><Icon name="info" /> <span>{t('rc.fewFound', { hints: hints.join('. ') })}</span></div>
          )}
          <div className="rec-list">
            {list.map((r, i) => <RecCard key={r.program.id} r={r} rank={i + 1} unlocked={unlockedIds.has(r.program.id)} />)}
          </div>
          {eligible.length > top.length && (
            <Button variant="ghost" onClick={() => setShowAll((v) => !v)}>
              {showAll ? t('rc.showBest') : t('rc.showAll', { n: eligible.length })}
            </Button>
          )}
        </>
      )}

      {eligible.length > 0 && <Levers />}

      {exclusions.length > 0 && (
        <details className="card excluded">
          <summary>
            {t('rc.excludedTitle', {
              n: exclusions.length,
              word: plural(exclusions.length, t('lv.progOne'), t('lv.progFew'), t('lv.progMany')),
            })}
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
          {t('rc.inPlanCount', { n: state.shortlist.length })}{t('rc.compareCount', { n: state.compare.length })}
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
        <p className="rec-unlocked-flag"><Icon name="spark" size={14} /> {t('lv.unlockedFlag')}</p>
      )}
      <UniCover programId={p.id} university={p.university} city={p.city} />

      <div className="rec-head">
        <ScoreRing score={r.score} />
        <div className="rec-title">
          <div className="rec-badges">
            <BandBadge band={r.band} />
            {p.grant === 'full' && <span className="tag tag-good">{t('rc.grant')}</span>}
          </div>
          <h2>{p.university}</h2>
          <p className="muted">{p.program}</p>
          <p className="small"><CountryTag code={p.country} /> {p.city}, {COUNTRY_LABELS[p.country]} · {p.language.map((l) => l.toUpperCase()).join(' / ')}</p>
        </div>
      </div>

      <div className="rec-facts">
        <div>
          <span className="small muted">{withGrant ? t('rc.costGrant') : t('rc.costFull')}</span>
          <b>≈{usd(withGrant ? r.costWithGrantUSD : r.yearlyCostUSD)}</b>
        </div>
        <div>
          <span className="small muted">{t('rc.deadline')}</span>
          <b className="small">{p.deadline.label}</b>
        </div>
        <EstimateNote />
        <SourceLink href={p.sourceUrl} label={t('rc.sourceCta')} strong />
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
            <p className="eyebrow">{t('rc.breakdown', { score: r.score })}</p>
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
              <p className="eyebrow">{t('rc.gaps')}</p>
              <ul className="bullet-list">{r.gaps.map((g) => <li key={g}>{g}</li>)}</ul>
            </div>
          )}
          <p className="small"><b>{t('rc.entrance')}</b> {p.entrance}</p>
          <div className="tags">{p.highlights.map((h) => <span key={h} className="tag">{h}</span>)}</div>
          <p className="small muted">
            Направления: {p.fields.map((f: Field) => FIELD_LABELS[f]).join(', ')}. Стоимость и дедлайн сверены с сайтом вуза —
            проверьте по ссылке перед подачей.
          </p>
          <div className="advice">
            {!advice && (
              <Button variant="secondary" small icon="spark" onClick={ask} disabled={loading}>
                {loading ? t('rc.aiLoading') : t('rc.aiCta')}
              </Button>
            )}
            {advice && (
              <div className="advice-box">
                <p className="eyebrow">
                  <Icon name="spark" size={14} /> {advice.source === 'ai' ? t('rc.aiBadge') : t('rc.rulesBadge')}
                </p>
                {advice.text.split('\n\n').map((t) => <p key={t}>{t}</p>)}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rec-actions">
        <Button small variant={inPlan ? 'primary' : 'secondary'} icon={inPlan ? 'check' : 'plus'} pressed={inPlan} onClick={() => dispatch({ type: 'toggleShortlist', id: p.id })}>
          {inPlan ? t('rc.inPlan') : t('rc.addPlan')}
        </Button>
        <Button small variant={inCompare ? 'primary' : 'ghost'} icon="compare" pressed={inCompare} onClick={() => dispatch({ type: 'toggleCompare', id: p.id })}>
          {inCompare ? t('rc.comparing') : t('rc.compare')}
        </Button>
        <Button small variant="ghost" onClick={() => setOpen((o) => !o)}>{open ? t('rc.collapse') : t('rc.why')}</Button>
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
        <b>{t('lv.previewTitle', { title: lever.title })}</b>
        <p className="small">
          {t('lv.previewText', { n: derived.recs.eligible.length })}
        </p>
      </div>
      <div className="preview-banner-actions">
        <Button small variant="accent" onClick={() => dispatch({ type: 'applyLever', id: lever.id })}>{t('lv.adopt')}</Button>
        <Button small variant="ghost" onClick={() => dispatch({ type: 'previewLever', id: null })}>{t('lv.previewBack')}</Button>
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
          <b>{t('rc.whatIf')}</b>{' '}
          <span className="muted small">
            {t('rc.whatIfSummary', {
              budget: usd(p.budgetUSD),
              interests: p.interests.map((f) => FIELD_LABELS[f]).join(', '),
              countries: p.countries.length ? p.countries.map((c) => COUNTRY_FLAG[c]).join(' ') : t('rc.allCountries'),
            })}
          </span>
        </span>
        <span className="whatif-chevron" aria-hidden>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="whatif-body">
          <label className="field">
            <span className="label">{t('rc.budgetYear')}<b>{usd(budget)}</b></span>
            <input type="range" min={0} max={50000} step={500} value={budget} onChange={(e) => setBudget(Number(e.target.value))} onPointerUp={() => save({ budgetUSD: budget })} onKeyUp={() => save({ budgetUSD: budget })} />
          </label>
          <div className="field">
            <span className="label">{t('rc.mainInterest')}</span>
            <div className="chips">
              {(Object.keys(FIELD_LABELS) as Field[]).map((f) => (
                <Chip key={f} selected={p.interests[0] === f} onClick={() => save({ interests: [f, ...p.interests.filter((x) => x !== f)].slice(0, 3) })}>
                  {FIELD_LABELS[f]}
                </Chip>
              ))}
            </div>
          </div>
          <div className="field">
            <span className="label">{t('rc.countries')}</span>
            <div className="chips">
              <Chip selected={p.countries.length === 0} onClick={() => save({ countries: [] })}>{t('rc.anyCountry')}</Chip>
              {(Object.keys(COUNTRY_LABELS) as CountryCode[]).map((c) => (
                <Chip key={c} selected={p.countries.includes(c)} onClick={() => save({ countries: p.countries.includes(c) ? p.countries.filter((x) => x !== c) : [...p.countries, c] })}>
                  <CountryTag code={c} /> {COUNTRY_LABELS[c]}
                </Chip>
              ))}
            </div>
          </div>
          <div className="field-row">
            <label className="field">
              <span className="label">IELTS</span>
              <select value={p.ielts ?? ''} onChange={(e) => save({ ielts: e.target.value ? Number(e.target.value) : null })}>
                <option value="">{t('rc.none')}</option>
                {[4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="label">{t('rc.untExpected')}</span>
              <select value={p.untExpected ?? ''} onChange={(e) => save({ untExpected: e.target.value ? Number(e.target.value) : null })}>
                <option value="">{t('rc.dontKnow')}</option>
                {[60, 70, 80, 90, 100, 110, 120, 130].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
          </div>
          <Button small variant="ghost" icon="edit" onClick={() => go('profile')}>{t('rc.fullForm')}</Button>
        </div>
      )}
    </section>
  );
}
