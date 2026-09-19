import { Button, Icon, Meter, PageHead } from '../components/ui';
import { GRADE_LABELS } from '../data/options';
import { } from '../engine/format';
import { plural, t } from '../i18n';
import { go } from '../router';
import { useStore } from '../state/store';

export function Diagnosis() {
  const { state, derived } = useStore();
  const d = derived.diagnosis;
  const n = derived.recs.eligible.length;

  return (
    <div className="stack">
      <PageHead eyebrow={t('dg.eyebrow')} title={d.headline}>
        {t('dg.sub', { grade: GRADE_LABELS[state.profile.grade], year: derived.roadmap.intakeYear })}
      </PageHead>

      <section className="card goal-card">
        <span className="goal-icon"><Icon name="flag" /></span>
        <div>
          <p className="eyebrow">{t('dg.goal')}</p>
          <p className="goal-text">{d.goal}</p>
        </div>
      </section>

      <section className="meters card">
        {d.meters.map((m) => (
          <div key={m.label} className="meter-block">
            <div className="meter-head">
              <span>{m.label}</span>
              <b>{m.value}%</b>
            </div>
            <Meter value={m.value} tone={m.value >= 70 ? 'good' : m.value >= 40 ? 'primary' : 'warn'} />
            <p className="small muted">{m.caption}</p>
          </div>
        ))}
        <p className="small muted meters-note">{t('dg.metersNote')}</p>
      </section>

      <div className="two-col">
        <section className="card">
          <h2 className="h-plus"><Icon name="check" /> {t('dg.strengths')}</h2>
          {d.strengths.length ? (
            <ul className="bullet-list">{d.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
          ) : (
            <p className="muted">{t('dg.noStrengths')}</p>
          )}
        </section>
        <section className="card">
          <h2 className="h-minus"><Icon name="warn" /> {t('dg.limits')}</h2>
          {d.constraints.length ? (
            <ul className="bullet-list">{d.constraints.map((s) => <li key={s}>{s}</li>)}</ul>
          ) : (
            <p className="muted">{t('dg.noLimits')}</p>
          )}
        </section>
      </div>

      <div className="page-actions">
        <Button variant="ghost" icon="edit" onClick={() => go('profile')}>{t('dg.editForm')}</Button>
        <Button iconRight="arrow" onClick={() => go('recs')}>
          {n > 0 ? t('dg.seeRecsN', { n, word: plural(n, t('dg.optOne'), t('dg.optFew'), t('dg.optMany')) }) : t('dg.seeRecs')}
        </Button>
      </div>
    </div>
  );
}
