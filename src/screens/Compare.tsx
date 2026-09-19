import type { ReactNode } from 'react';
import { BandBadge, Button, Chip, EstimateNote, Icon, PageHead, SourceLink } from '../components/ui';
import { COUNTRY_FLAG, COUNTRY_LABELS } from '../data/options';
import { usd } from '../engine/format';
import { effectiveIelts } from '../engine/recommend';
import { t } from '../i18n';
import { go } from '../router';
import { useStore } from '../state/store';
import type { Recommendation } from '../types';

interface Row {
  label: string;
  value: (r: Recommendation) => ReactNode;
  /** numeric key; the best column gets highlighted */
  best?: (r: Recommendation) => number;
  lowerIsBetter?: boolean;
}

export function Compare() {
  const { state, dispatch, derived } = useStore();
  const p = state.profile;
  const byId = new Map(derived.recs.eligible.map((r) => [r.program.id, r]));
  let selected = state.compare.map((id) => byId.get(id)).filter((r): r is Recommendation => !!r);
  const autoPicked = selected.length < 2;
  if (autoPicked) selected = derived.recs.top.slice(0, 2);

  const ie = effectiveIelts(p);
  const rows: Row[] = [
    { label: t('cp.match'), value: (r) => <b>{r.score}/100</b>, best: (r) => r.score },
    { label: t('cp.readiness'), value: (r) => <BandBadge band={r.band} />, best: (r) => ({ safe: 2, target: 1, reach: 0 })[r.band] },
    { label: t('cp.costFull'), value: (r) => `≈${usd(r.yearlyCostUSD)}`, best: (r) => r.yearlyCostUSD, lowerIsBetter: true },
    { label: t('cp.costGrant'), value: (r) => (r.program.grant === 'none' ? t('cp.noGrants') : `≈${usd(r.costWithGrantUSD)}`), best: (r) => r.costWithGrantUSD, lowerIsBetter: true },
    { label: t('cp.funding'), value: (r) => r.program.grantNote },
    { label: t('cp.language'), value: (r) => r.program.language.map((l) => l.toUpperCase()).join(' / ') },
    {
      label: t('cp.english'),
      value: (r) => (r.program.minIelts ? <>IELTS {r.program.minIelts} {ie >= r.program.minIelts ? <span className="ok">{t('cp.haveIt')}</span> : <span className="bad">{t('cp.needPlus', { n: (r.program.minIelts - ie).toFixed(1) })}</span>}</> : t('cp.notRequired')),
    },
    {
      label: t('cp.exams'),
      value: (r) => [r.program.minUnt ? t('cp.untFrom', { n: r.program.minUnt }) : null, r.program.satRecommended ? t('cp.satWanted') : null, t('cp.gpaFrom', { n: r.program.minGpa })].filter(Boolean).join(' · '),
    },
    { label: t('cp.entrance'), value: (r) => r.program.entrance },
    { label: t('cp.deadline'), value: (r) => <>{r.program.deadline.label} <EstimateNote /></> },
    { label: t('cp.city'), value: (r) => `${COUNTRY_FLAG[r.program.country]} ${r.program.city}, ${COUNTRY_LABELS[r.program.country]}` },
    { label: t('cp.gaps'), value: (r) => (r.gaps.length ? r.gaps.join('; ') : t('cp.noGaps')) , best: (r) => r.gaps.length, lowerIsBetter: true },
  ];

  const bestIdx = (row: Row) => {
    if (!row.best) return -1;
    const vals = selected.map(row.best);
    const target = row.lowerIsBetter ? Math.min(...vals) : Math.max(...vals);
    return vals.filter((v) => v === target).length === vals.length ? -1 : vals.indexOf(target);
  };

  const winner = [...selected].sort((a, b) => b.score - a.score)[0];

  return (
    <div className="stack">
      <PageHead eyebrow={t('cp.eyebrow')} title={t('cp.title')}>
        {autoPicked ? t('cp.autoNote') : t('cp.bestNote')}
      </PageHead>

      <div className="chips">
        {derived.recs.eligible.slice(0, 8).map((r) => (
          <Chip key={r.program.id} selected={state.compare.includes(r.program.id)} onClick={() => dispatch({ type: 'toggleCompare', id: r.program.id })}>
            {r.program.university} · {r.program.program.split(' (')[0]}
          </Chip>
        ))}
      </div>

      {selected.length < 2 ? (
        <section className="card empty">
          <Icon name="compare" size={32} />
          <h2>{t('cp.needTwo')}</h2>
          <p className="muted">{t('cp.needTwoText')}</p>
          <Button onClick={() => go('recs')}>{t('cp.toRecs')}</Button>
        </section>
      ) : (
        <div className="compare-wrap">
          <table className="compare" style={{ ['--cols' as string]: selected.length }}>
            <thead>
              <tr>
                <th scope="col"><span className="sr-only">{t('cp.param')}</span></th>
                {selected.map((r) => (
                  <th key={r.program.id} scope="col">
                    <b>{r.program.university}</b>
                    <span className="small muted">{r.program.program}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const b = bestIdx(row);
                return (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    {selected.map((r, i) => (
                      <td key={r.program.id} className={i === b ? 'best' : undefined}>{row.value(r)}</td>
                    ))}
                  </tr>
                );
              })}
              <tr>
                <th scope="row">{t('cp.source')}</th>
                {selected.map((r) => (
                  <td key={r.program.id}><SourceLink href={r.program.sourceUrl} /></td>
                ))}
              </tr>
              <tr>
                <th scope="row">{t('cp.action')}</th>
                {selected.map((r) => {
                  const inPlan = state.shortlist.includes(r.program.id);
                  return (
                    <td key={r.program.id}>
                      <Button small variant={inPlan ? 'primary' : 'secondary'} icon={inPlan ? 'check' : 'plus'} onClick={() => dispatch({ type: 'toggleShortlist', id: r.program.id })}>
                        {inPlan ? t('rc.inPlan') : t('rc.addPlan')}
                      </Button>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {winner && selected.length >= 2 && (
        <section className="card verdict">
          <Icon name="spark" />
          <p>
            <b>{t('cp.verdict')}</b>{t('cp.verdictText')}<b>{winner.program.university}</b> ({winner.score}/100).
            {t('cp.verdictTail')}
          </p>
        </section>
      )}

      <div className="page-actions">
        <Button variant="ghost" icon="back" onClick={() => go('recs')}>{t('cp.recs')}</Button>
        <Button iconRight="arrow" onClick={() => go('plan')}>{t('cp.buildPlan', { n: state.shortlist.length })}</Button>
      </div>
    </div>
  );
}
