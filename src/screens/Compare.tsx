import type { ReactNode } from 'react';
import { BandBadge, Button, Chip, EstimateNote, Icon, PageHead, SourceLink } from '../components/ui';
import { COUNTRY_FLAG, COUNTRY_LABELS } from '../data/options';
import { usd } from '../engine/format';
import { effectiveIelts } from '../engine/recommend';
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
    { label: 'Совпадение с профилем', value: (r) => <b>{r.score}/100</b>, best: (r) => r.score },
    { label: 'Оценка готовности', value: (r) => <BandBadge band={r.band} />, best: (r) => ({ safe: 2, target: 1, reach: 0 })[r.band] },
    { label: 'Расходы в год без гранта', value: (r) => `≈${usd(r.yearlyCostUSD)}`, best: (r) => r.yearlyCostUSD, lowerIsBetter: true },
    { label: 'С грантом / стипендией', value: (r) => (r.program.grant === 'none' ? 'грантов почти нет' : `≈${usd(r.costWithGrantUSD)}`), best: (r) => r.costWithGrantUSD, lowerIsBetter: true },
    { label: 'Финансирование', value: (r) => r.program.grantNote },
    { label: 'Язык обучения', value: (r) => r.program.language.map((l) => l.toUpperCase()).join(' / ') },
    {
      label: 'Английский',
      value: (r) => (r.program.minIelts ? <>IELTS {r.program.minIelts} {ie >= r.program.minIelts ? <span className="ok">✓ у вас есть</span> : <span className="bad">нужно +{(r.program.minIelts - ie).toFixed(1)}</span>}</> : 'не обязателен'),
    },
    {
      label: 'Экзамены',
      value: (r) => [r.program.minUnt ? `ЕНТ от ~${r.program.minUnt}` : null, r.program.satRecommended ? 'SAT желателен' : null, `балл ${r.program.minGpa}+`].filter(Boolean).join(' · '),
    },
    { label: 'Как поступают', value: (r) => r.program.entrance },
    { label: 'Подача', value: (r) => <>{r.program.deadline.label} <EstimateNote /></> },
    { label: 'Город', value: (r) => `${COUNTRY_FLAG[r.program.country]} ${r.program.city}, ${COUNTRY_LABELS[r.program.country]}` },
    { label: 'Что подтянуть', value: (r) => (r.gaps.length ? r.gaps.join('; ') : 'пробелов нет') , best: (r) => r.gaps.length, lowerIsBetter: true },
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
      <PageHead eyebrow="Этап 5 · Сравнение" title="Сравните варианты по важному для вас">
        {autoPicked ? 'Вы ещё не выбрали программы — сравниваем две лучшие. Выберите свои ниже.' : 'Лучшее значение в строке подсвечено.'}
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
          <h2>Нужно минимум два варианта</h2>
          <p className="muted">Расширьте условия в анкете, чтобы появилось больше рекомендаций.</p>
          <Button onClick={() => go('recs')}>К рекомендациям</Button>
        </section>
      ) : (
        <div className="compare-wrap">
          <table className="compare" style={{ ['--cols' as string]: selected.length }}>
            <thead>
              <tr>
                <th scope="col"><span className="sr-only">Параметр</span></th>
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
                <th scope="row">Источник</th>
                {selected.map((r) => (
                  <td key={r.program.id}><SourceLink href={r.program.sourceUrl} /></td>
                ))}
              </tr>
              <tr>
                <th scope="row">Действие</th>
                {selected.map((r) => {
                  const inPlan = state.shortlist.includes(r.program.id);
                  return (
                    <td key={r.program.id}>
                      <Button small variant={inPlan ? 'primary' : 'secondary'} icon={inPlan ? 'check' : 'plus'} onClick={() => dispatch({ type: 'toggleShortlist', id: r.program.id })}>
                        {inPlan ? 'В плане' : 'В план'}
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
            <b>Вывод:</b> по совокупности ваших ответов сильнее совпадает <b>{winner.program.university}</b> ({winner.score}/100).
            {' '}Но если для вас решающая — цена, смотрите строку «С грантом / стипендией».
          </p>
        </section>
      )}

      <div className="page-actions">
        <Button variant="ghost" icon="back" onClick={() => go('recs')}>Рекомендации</Button>
        <Button iconRight="arrow" onClick={() => go('plan')}>Построить план ({state.shortlist.length})</Button>
      </div>
    </div>
  );
}
