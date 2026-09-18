import { useMemo } from 'react';
import { Reveal } from '../components/motion';
import { Button, Icon } from '../components/ui';
import { plural } from '../engine/format';
import { rankLevers, type LeverEffect, type LeverKind } from '../engine/leverage';
import { useStore } from '../state/store';

const KIND_ICON: Record<LeverKind, string> = {
  exam: 'exam',
  academic: 'academic',
  budget: 'info',
  activity: 'activity',
  scope: 'compare',
};

const COST_LABEL = { 1: 'быстро', 2: 'средне', 3: 'долго' } as const;

/**
 * «Рычаги» — обратная сторона рекомендаций. Список отвечает, куда поступать сейчас;
 * этот блок отвечает, что изменить, чтобы список стал лучше, и позволяет примерить
 * изменение до того, как принимать его за цель.
 */
export function Levers() {
  const { state, dispatch } = useStore();
  const effects = useMemo(() => rankLevers(state.profile), [state.profile]);

  if (effects.length === 0) return null;

  const previewed = state.preview;

  return (
    <Reveal as="section" className="levers card" variant="scale">
      <div className="levers-head">
        <span className="levers-icon"><Icon name="spark" /></span>
        <div>
          <h2>Что изменит список сильнее всего</h2>
          <p className="muted small">
            Мы подставили каждое изменение в тот же алгоритм подбора и посчитали разницу. Это не прогноз шансов —
            это пересчёт: нажмите «примерить», чтобы увидеть список таким, каким он станет.
          </p>
        </div>
      </div>

      <ol className="levers-list">
        {effects.slice(0, 5).map((e, i) => (
          <LeverRow
            key={e.lever.id}
            e={e}
            rank={i + 1}
            active={previewed === e.lever.id}
            onPreview={() => dispatch({ type: 'previewLever', id: previewed === e.lever.id ? null : e.lever.id })}
            onApply={() => dispatch({ type: 'applyLever', id: e.lever.id })}
          />
        ))}
      </ol>
    </Reveal>
  );
}

function LeverRow({
  e,
  rank,
  active,
  onPreview,
  onApply,
}: {
  e: LeverEffect;
  rank: number;
  active: boolean;
  onPreview: () => void;
  onApply: () => void;
}) {
  const { lever, unlocked, scoreDelta, bandUpgrades } = e;

  return (
    <li className={`lever${active ? ' lever-active' : ''}`}>
      <span className="lever-rank num">{rank}</span>
      <span className="lever-icon"><Icon name={KIND_ICON[lever.kind]} size={18} /></span>

      <div className="lever-body">
        <b className="lever-title">{lever.title}</b>

        <div className="lever-gains">
          {unlocked.length > 0 && (
            <span className="lever-gain lever-gain-strong">
              <Icon name="plus" size={13} />{unlocked.length}&nbsp;{plural(unlocked.length, 'программа', 'программы', 'программ')}
            </span>
          )}
          {bandUpgrades > 0 && (
            <span className="lever-gain">
              <Icon name="check" size={13} />{bandUpgrades}&nbsp;{plural(bandUpgrades, 'вариант', 'варианта', 'вариантов')} станет надёжнее
            </span>
          )}
          {scoreDelta > 0 && <span className="lever-gain">совпадение +{scoreDelta}</span>}
        </div>

        {unlocked.length > 0 && (
          <p className="small muted lever-unlocked">
            Откроется: {unlocked.slice(0, 4).map((p) => p.university).join(', ')}
            {unlocked.length > 4 && ` и ещё ${unlocked.length - 4}`}
          </p>
        )}

        <p className="small muted lever-effort">
          <Icon name="deadline" size={13} /> {lever.effort} · усилие: {COST_LABEL[lever.cost]}
        </p>
      </div>

      <div className="lever-actions">
        <Button small variant={active ? 'accent' : 'secondary'} onClick={onPreview}>
          {active ? 'Вернуть как было' : 'Примерить'}
        </Button>
        <Button small variant="ghost" onClick={onApply}>Взять целью</Button>
      </div>
    </li>
  );
}
