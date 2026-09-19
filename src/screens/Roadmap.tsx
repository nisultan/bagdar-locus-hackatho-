import { useState } from 'react';
import { t as tr } from '../i18n';
import { Button, CATEGORY_META, EstimateNote, Icon, Meter, PageHead, SourceLink } from '../components/ui';
import { PROGRAMS } from '../data/programs';
import { monthYear } from '../engine/format';
import { go } from '../router';
import { useStore } from '../state/store';
import type { RoadmapTask, TaskCategory } from '../types';

export function RoadmapScreen() {
  const { state, derived } = useStore();
  const { tasks, intakeYear } = derived.roadmap;
  const [filter, setFilter] = useState<TaskCategory | 'all'>('all');
  const [hideDone, setHideDone] = useState(false);

  const visible = tasks.filter((t) => (filter === 'all' || t.category === filter) && !(hideDone && state.done[t.id]));
  const groups = new Map<string, RoadmapTask[]>();
  for (const t of visible) groups.set(t.due, [...(groups.get(t.due) ?? []), t]);
  const { done, total } = derived.progress;
  const shortlist = state.shortlist.map((id) => PROGRAMS.find((p) => p.id === id)).filter(Boolean);

  return (
    <div className="stack">
      <PageHead eyebrow={tr('pl.eyebrow')} title={tr('pl.title', { year: intakeYear })}>
        {tr('pl.lead')}
      </PageHead>

      <section className="card plan-summary">
        <div className="plan-progress">
          <div className="meter-head"><span>{tr('pl.done')}</span><b>{tr('pl.doneOf', { done, total })}</b></div>
          <Meter value={done} max={Math.max(total, 1)} tone="good" />
        </div>
        <div>
          <p className="eyebrow">{tr('pl.applyTo')}</p>
          {shortlist.length ? (
            <div className="tags">{shortlist.map((p) => <span key={p!.id} className="tag">{p!.university}</span>)}</div>
          ) : (
            <p className="muted small">{tr('pl.noPrograms')}</p>
          )}
          <button className="link-btn" onClick={() => go('recs')}>{tr('pl.editList')}</button>
        </div>
      </section>

      <div className="filters" role="group" aria-label={tr('pl.filter')}>
        <button className={`filter${filter === 'all' ? ' on' : ''}`} onClick={() => setFilter('all')}>{tr('pl.all')}</button>
        {(Object.keys(CATEGORY_META) as TaskCategory[]).map((c) => (
          <button key={c} className={`filter${filter === c ? ' on' : ''}`} onClick={() => setFilter(c)}>
            <Icon name={CATEGORY_META[c].icon} size={14} /> {tr(CATEGORY_META[c].label)}
          </button>
        ))}
        <label className="toggle small">
          <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} />
          <span className="toggle-ui" aria-hidden />
          <span>{tr('pl.hideDone')}</span>
        </label>
      </div>

      {visible.length === 0 ? (
        <section className="card empty">
          <Icon name="check" size={32} />
          <h2>{tr('pl.emptyTitle')}</h2>
          <p className="muted">{tr('pl.emptyText')}</p>
        </section>
      ) : (
        <ol className="timeline">
          {[...groups.entries()].map(([due, items]) => (
            <li key={due} className="timeline-month">
              <h2 className="timeline-label">{monthYear(due)}</h2>
              <ul className="task-list">
                {items.map((t) => <TaskItem key={t.id} t={t} highlight={derived.next?.id === t.id} />)}
              </ul>
            </li>
          ))}
        </ol>
      )}

      <div className="page-actions">
        <Button variant="ghost" icon="back" onClick={() => go('compare')}>{tr('pl.compare')}</Button>
        <Button variant="accent" iconRight="arrow" onClick={() => go('next')}>{tr('pl.myNext')}</Button>
      </div>
    </div>
  );
}

export function TaskItem({ t, highlight }: { t: RoadmapTask; highlight?: boolean }) {
  const { state, dispatch } = useStore();
  const done = !!state.done[t.id];
  return (
    <li className={`task${done ? ' task-done' : ''}${highlight ? ' task-next' : ''}`}>
      <label className="task-check">
        <input type="checkbox" checked={done} onChange={() => dispatch({ type: 'toggleDone', id: t.id })} />
        <span className="checkbox-ui" aria-hidden><Icon name="check" size={14} /></span>
        <span className="sr-only">{tr('pl.markDone')}</span>
      </label>
      <div className="task-body">
        <div className="task-top">
          <span className={`cat cat-${t.category}`}><Icon name={CATEGORY_META[t.category].icon} size={14} /> {tr(CATEGORY_META[t.category].label)}</span>
          {highlight && <span className="tag tag-accent">{tr('pl.nextStep')}</span>}
          {t.estimated && <EstimateNote>{tr('pl.dateEstimate')}</EstimateNote>}
        </div>
        <b className="task-title">{t.title}</b>
        <p className="small muted">{t.why}</p>
        {t.sourceUrl && <SourceLink href={t.sourceUrl} label={tr('pl.source')} />}
      </div>
    </li>
  );
}
