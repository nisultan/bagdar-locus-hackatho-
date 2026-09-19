import { Reveal } from '../components/motion';
import { Button, CountryTag, Icon, PageHead } from '../components/ui';
import {
  ACHIEVEMENT_LABELS, COUNTRY_LABELS, ENGLISH_LABELS, FIELD_ICON, FIELD_LABELS, GRADE_LABELS, PRIORITY_LABELS,
} from '../data/options';
import { usd } from '../engine/format';
import { effectiveIelts } from '../engine/recommend';
import { t } from '../i18n';
import { go } from '../router';
import { useStore } from '../state/store';

/**
 * Карточка абитуриента: всё, что сервис о вас знает, на одной странице.
 * Не этап маршрута — справочная страница, куда можно вернуться в любой момент,
 * поэтому каждая секция ведёт на нужный шаг анкеты, а не заставляет проходить её заново.
 */
export function Profile() {
  const { state, derived } = useStore();
  const p = state.profile;
  const ie = effectiveIelts(p);

  if (!state.profileDone) {
    return (
      <div className="stack">
        <PageHead eyebrow={t('me.eyebrow')} title={t('me.emptyTitle')} />
        <section className="card empty">
          <Icon name="edit" size={32} />
          <p className="muted">{t('me.emptyText')}</p>
          <Button iconRight="arrow" onClick={() => go('profile')}>{t('landing.ctaBuild')}</Button>
        </section>
      </div>
    );
  }

  return (
    <div className="stack">
      <PageHead eyebrow={t('me.eyebrow')} title={p.name ? t('me.titleName', { name: p.name }) : t('me.title')}>
        {t('me.sub', { grade: GRADE_LABELS[p.grade], year: derived.roadmap.intakeYear })}
      </PageHead>

      <section className="me-stats">
        <Stat value={derived.recs.eligible.length} label={t('me.statFit')} />
        <Stat value={state.shortlist.length} label={t('me.statPlan')} />
        <Stat value={`${derived.progress.done}/${derived.progress.total}`} label={t('me.statSteps')} />
      </section>

      <div className="me-grid">
        <Card title={t('me.interests')} icon="spark" step={2}>
          <div className="me-chips">
            {p.interests.map((f, i) => (
              <span key={f} className={`me-chip${i === 0 ? ' me-chip-main' : ''}`}>
                <Icon name={FIELD_ICON[f]} size={16} /> {FIELD_LABELS[f]}
                {i === 0 && <b className="me-chip-tag">{t('wz.mainTag')}</b>}
              </span>
            ))}
          </div>
        </Card>

        <Card title={t('me.academics')} icon="academic" step={3}>
          <Row label={t('me.gpa')} value={p.gpa.toFixed(1)} />
          <Row label={t('me.unt')} value={p.untExpected != null ? String(p.untExpected) : t('me.notSet')} />
          <Row
            label={t('me.englishRow')}
            value={p.ielts != null ? `IELTS ${p.ielts}` : t('me.englishSelf', { level: ENGLISH_LABELS[p.english], ielts: ie.toFixed(1) })}
          />
          <Row label="SAT" value={p.sat != null ? String(p.sat) : t('me.notSet')} />
          <Row label={t('me.achievements')} value={ACHIEVEMENT_LABELS[p.achievements]} />
        </Card>

        <Card title={t('me.geography')} icon="compare" step={4}>
          <div className="me-chips">
            {p.countries.length === 0 ? (
              <span className="me-chip">{t('wz.anyCountry')}</span>
            ) : (
              p.countries.map((c) => (
                <span key={c} className="me-chip"><CountryTag code={c} /> {COUNTRY_LABELS[c]}</span>
              ))
            )}
          </div>
          <Row label={t('me.budget')} value={`${usd(p.budgetUSD)} / ${t('me.perYear')}`} />
          <Row label={t('me.grant')} value={p.needGrant ? t('me.yes') : t('me.no')} />
        </Card>

        <Card title={t('me.priorities')} icon="flag" step={5}>
          <ol className="me-priority">
            {p.priorities.map((pr) => (
              <li key={pr}>{PRIORITY_LABELS[pr]}</li>
            ))}
          </ol>
        </Card>
      </div>

      <Reveal as="section" className="card me-privacy" variant="scale">
        <Icon name="lock" />
        <p className="small">
          {t('me.privacyNote')}{' '}
          <a href="#/privacy">{t('app.privacy')}</a>
        </p>
      </Reveal>

      <div className="page-actions">
        <Button variant="ghost" icon="edit" onClick={() => go('profile')}>{t('me.editAll')}</Button>
        <Button iconRight="arrow" onClick={() => go('recs')}>{t('dg.seeRecs')}</Button>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="me-stat">
      <b className="num">{value}</b>
      <span className="small muted">{label}</span>
    </div>
  );
}

function Card({ title, icon, step, children }: { title: string; icon: string; step: number; children: React.ReactNode }) {
  return (
    <section className="card me-card">
      <header className="me-card-head">
        <span className="me-card-icon"><Icon name={icon} size={18} /></span>
        <h2>{title}</h2>
        <button className="link-btn" onClick={() => go(`profile/${step}`)}>{t('me.edit')}</button>
      </header>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="me-row">
      <span className="small muted">{label}</span>
      <b>{value}</b>
    </div>
  );
}
