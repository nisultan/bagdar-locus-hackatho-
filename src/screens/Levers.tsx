import { useMemo } from 'react';
import { Reveal } from '../components/motion';
import { Button, Icon } from '../components/ui';
import { plural, t } from '../i18n';
import { rankLevers, type LeverEffect, type LeverKind } from '../engine/leverage';
import { useStore } from '../state/store';

const KIND_ICON: Record<LeverKind, string> = {
  exam: 'exam',
  academic: 'academic',
  budget: 'info',
  activity: 'activity',
  scope: 'compare',
};

const COST_KEY = { 1: 'lv.cost1', 2: 'lv.cost2', 3: 'lv.cost3' } as const;

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
          <h2>{t('lv.title')}</h2>
          <p className="muted small">
            {t('lv.lead')}
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
              <Icon name="plus" size={13} />{unlocked.length}&nbsp;{plural(unlocked.length, t('lv.progOne'), t('lv.progFew'), t('lv.progMany'))}
            </span>
          )}
          {bandUpgrades > 0 && (
            <span className="lever-gain">
              <Icon name="check" size={13} />{bandUpgrades}&nbsp;{plural(bandUpgrades, t('lv.optOne'), t('lv.optFew'), t('lv.optMany'))} {t('lv.safer')}
            </span>
          )}
          {scoreDelta > 0 && <span className="lever-gain">{t('lv.match', { n: scoreDelta })}</span>}
        </div>

        {unlocked.length > 0 && (
          <p className="small muted lever-unlocked">
            {t('lv.opens', { list: unlocked.slice(0, 4).map((p) => p.university).join(', ') })}
            {unlocked.length > 4 && t('lv.opensMore', { n: unlocked.length - 4 })}
          </p>
        )}

        <p className="small muted lever-effort">
          <Icon name="deadline" size={13} /> {t('lv.effortLabel', { effort: lever.effort, cost: t(COST_KEY[lever.cost]) })}
        </p>
      </div>

      <div className="lever-actions">
        <Button small variant={active ? 'accent' : 'secondary'} onClick={onPreview}>
          {active ? t('lv.undo') : t('lv.try')}
        </Button>
        <Button small variant="ghost" onClick={onApply}>{t('lv.adopt')}</Button>
      </div>
    </li>
  );
}
