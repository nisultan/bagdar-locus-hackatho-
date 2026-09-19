import { t as tr } from '../i18n';
import { Button, CATEGORY_META, EstimateNote, Icon, PageHead, SourceLink } from '../components/ui';
import { monthYear, plural } from '../engine/format';
import { go } from '../router';
import { useStore } from '../state/store';

export function NextStep() {
  const { state, dispatch, derived } = useStore();
  const { next, progress, roadmap } = derived;
  const upcoming = roadmap.tasks.filter((t) => !state.done[t.id] && t.id !== next?.id).slice(0, 3);
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const r = 44;
  const c = 2 * Math.PI * r;
  const left = progress.total - progress.done;

  return (
    <div className="stack">
      <PageHead eyebrow="Этап 7 · Следующее действие" title={state.profile.name ? `${state.profile.name}, ваш шаг на сейчас` : 'Ваш шаг на сейчас'} />

      <div className="next-layout">
        {next ? (
          <section className="card next-hero">
            <div className="next-top">
              <span className={`cat cat-${next.category}`}><Icon name={CATEGORY_META[next.category].icon} size={14} /> {tr(CATEGORY_META[next.category].label)}</span>
              <span className="small">до: <b>{monthYear(next.due)}</b></span>
              {next.estimated && <EstimateNote>дата — ориентир</EstimateNote>}
            </div>
            <h2 className="next-title">{next.title}</h2>
            <p className="next-why">{next.why}</p>
            {next.sourceUrl && <SourceLink href={next.sourceUrl} label="Где это сделать" />}
            <div className="next-actions">
              <Button variant="accent" icon="check" onClick={() => dispatch({ type: 'toggleDone', id: next.id })}>
                Готово, дальше
              </Button>
              <Button variant="ghost" onClick={() => go('plan')}>Весь план</Button>
            </div>
          </section>
        ) : (
          <section className="card next-hero next-finished">
            <Icon name="spark" size={36} />
            <h2 className="next-title">Все шаги плана выполнены!</h2>
            <p className="next-why">Проверьте ответы от университетов и актуальные даты на официальных сайтах. Если что-то поменялось — обновите анкету, и план перестроится.</p>
            <Button icon="edit" onClick={() => go('profile')}>Обновить анкету</Button>
          </section>
        )}

        <aside className="card progress-card">
          <div className="big-ring" aria-label={`Выполнено ${pct}%`}>
            <svg width="110" height="110">
              <circle cx="55" cy="55" r={r} className="ring-bg" />
              <circle cx="55" cy="55" r={r} className="ring-fg ring-accent" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform="rotate(-90 55 55)" />
            </svg>
            <span>{pct}%</span>
          </div>
          <p><b>{progress.done}</b> из {progress.total} шагов</p>
          <p className="small muted">{left > 0 ? `Осталось ${left} ${plural(left, 'шаг', 'шага', 'шагов')} до поступления в ${roadmap.intakeYear}` : 'Маршрут пройден'}</p>
        </aside>
      </div>

      {upcoming.length > 0 && (
        <section>
          <h2 className="section-title">Дальше по плану</h2>
          <ul className="upcoming">
            {upcoming.map((t) => (
              <li key={t.id} className="card upcoming-item">
                <span className={`cat cat-${t.category}`}><Icon name={CATEGORY_META[t.category].icon} size={14} /></span>
                <div>
                  <b>{t.title}</b>
                  <p className="small muted">{monthYear(t.due)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="page-actions">
        <Button variant="ghost" icon="edit" onClick={() => go('profile')}>Изменить анкету</Button>
        <Button
          variant="ghost"
          icon="refresh"
          onClick={() => {
            if (window.confirm('Сбросить анкету и весь прогресс?')) {
              dispatch({ type: 'reset' });
              go('');
            }
          }}
        >
          Начать заново
        </Button>
      </div>
    </div>
  );
}
