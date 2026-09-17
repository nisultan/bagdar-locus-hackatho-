import { Button, Icon, Meter, PageHead } from '../components/ui';
import { GRADE_LABELS } from '../data/options';
import { plural } from '../engine/format';
import { go } from '../router';
import { useStore } from '../state/store';

export function Diagnosis() {
  const { state, derived } = useStore();
  const d = derived.diagnosis;
  const n = derived.recs.eligible.length;

  return (
    <div className="stack">
      <PageHead eyebrow="Этап 3 · Диагностика" title={d.headline}>
        {GRADE_LABELS[state.profile.grade]} · поступление в {derived.roadmap.intakeYear} году
      </PageHead>

      <section className="card goal-card">
        <span className="goal-icon"><Icon name="flag" /></span>
        <div>
          <p className="eyebrow">Образовательная цель</p>
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
        <p className="small muted meters-note">Шкалы показывают готовность профиля относительно программ в базе, а не вероятность поступления.</p>
      </section>

      <div className="two-col">
        <section className="card">
          <h2 className="h-plus"><Icon name="check" /> Сильные стороны</h2>
          {d.strengths.length ? (
            <ul className="bullet-list">{d.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
          ) : (
            <p className="muted">Пока ярких преимуществ нет — план подскажет, что прокачать в первую очередь.</p>
          )}
        </section>
        <section className="card">
          <h2 className="h-minus"><Icon name="warn" /> Ограничения</h2>
          {d.constraints.length ? (
            <ul className="bullet-list">{d.constraints.map((s) => <li key={s}>{s}</li>)}</ul>
          ) : (
            <p className="muted">Серьёзных ограничений не видно.</p>
          )}
        </section>
      </div>

      <div className="page-actions">
        <Button variant="ghost" icon="edit" onClick={() => go('profile')}>Изменить анкету</Button>
        <Button iconRight="arrow" onClick={() => go('recs')}>
          {n > 0 ? `Смотреть рекомендации (${n} ${plural(n, 'вариант', 'варианта', 'вариантов')})` : 'Смотреть рекомендации'}
        </Button>
      </div>
    </div>
  );
}
