import { ACHIEVEMENT_LABELS } from '../data/options';
import type { Achievements, Profile, Program } from '../types';
import { usd } from './format';
import { t } from '../i18n';
import { effectiveIelts, recommend } from './recommend';

/**
 * Обратная задача к рекомендациям.
 *
 * Рекомендации отвечают «какие вузы подходят вам сейчас». Рычаг отвечает на другой вопрос:
 * «что изменить в себе, чтобы список стал лучше». Мы не угадываем и не моделируем шансы —
 * берём то же чистое `recommend()`, подставляем изменённый профиль и честно считаем разницу.
 * Поэтому любое число здесь воспроизводимо: это не прогноз, а пересчёт.
 */

export type LeverKind = 'exam' | 'academic' | 'budget' | 'activity' | 'scope';

export interface Lever {
  id: string;
  kind: LeverKind;
  /** Что именно в профиле меняется. Из одной группы показываем только лучший рычаг. */
  group: 'ielts' | 'unt' | 'gpa' | 'budget' | 'achievement' | 'countries';
  /** Коротко: что именно меняется. */
  title: string;
  /** Чего это стоит — честно, без обещаний сроков поступления. */
  effort: string;
  /** 1 — почти бесплатно, 3 — долго и дорого. Используется только для сортировки. */
  cost: 1 | 2 | 3;
  apply: (p: Profile) => Profile;
}

export interface LeverEffect {
  lever: Lever;
  /** Программы, которые проходят по требованиям только после изменения. */
  unlocked: Program[];
  /** Насколько вырастет средняя оценка совпадения по топу. */
  scoreDelta: number;
  /** Сколько вариантов поднялось в более уверенную категорию (мечта → реалистичный и т.д.). */
  bandUpgrades: number;
  /** Итоговый вес для сортировки: эффект, делённый на усилие. */
  weight: number;
}

const BAND_RANK = { reach: 0, target: 1, safe: 2 } as const;
const ACHIEVEMENT_STEPS: Achievements[] = ['none', 'school', 'regional', 'national', 'international'];

function avgTopScore(p: Profile): number {
  const top = recommend(p).top;
  if (top.length === 0) return 0;
  return top.reduce((sum, r) => sum + r.score, 0) / top.length;
}

/** Набор реалистичных улучшений под конкретный профиль. Недоступные варианты не показываем. */
export function leversFor(p: Profile): Lever[] {
  const levers: Lever[] = [];
  const ielts = effectiveIelts(p);

  // Английский: шаг в 0.5 балла — это обычная цель одного курса подготовки.
  if (ielts < 7.5) {
    const to = Math.min(8, ielts + 0.5);
    levers.push({
      id: 'ielts-05',
      group: 'ielts',
      kind: 'exam',
      title: t('lv.ielts', { from: ielts.toFixed(1), to: to.toFixed(1) }),
      effort: t('lv.ieltsEffort1'),
      cost: 2,
      apply: (x) => ({ ...x, ielts: to }),
    });
  }
  if (ielts < 7) {
    const to = Math.min(8, ielts + 1);
    levers.push({
      id: 'ielts-10',
      group: 'ielts',
      kind: 'exam',
      title: t('lv.ielts', { from: ielts.toFixed(1), to: to.toFixed(1) }),
      effort: t('lv.ieltsEffort2'),
      cost: 3,
      apply: (x) => ({ ...x, ielts: to }),
    });
  }

  // ЕНТ: если балл ещё не назван, сам факт пробного теста меняет картину.
  if (p.untExpected == null) {
    levers.push({
      id: 'unt-measure',
      group: 'unt',
      kind: 'exam',
      title: t('lv.untTrial'),
      effort: t('lv.untTrialEffort'),
      cost: 1,
      apply: (x) => ({ ...x, untExpected: 100 }),
    });
  } else {
    if (p.untExpected < 130) {
      const to = Math.min(140, p.untExpected + 10);
      levers.push({
        id: 'unt-10',
        group: 'unt',
        kind: 'exam',
        title: t('lv.unt', { from: p.untExpected, to }),
        effort: t('lv.untEffort1'),
        cost: 2,
        apply: (x) => ({ ...x, untExpected: to }),
      });
    }
    if (p.untExpected < 120) {
      const to = Math.min(140, p.untExpected + 20);
      levers.push({
        id: 'unt-20',
        group: 'unt',
        kind: 'exam',
        title: t('lv.unt', { from: p.untExpected, to }),
        effort: t('lv.untEffort2'),
        cost: 3,
        apply: (x) => ({ ...x, untExpected: to }),
      });
    }
  }

  // Аттестат: подтянуть можно только пока учишься.
  if (p.gpa < 4.9 && p.grade !== 'graduate') {
    const to = Math.min(5, Math.round((p.gpa + 0.3) * 10) / 10);
    levers.push({
      id: 'gpa',
      group: 'gpa',
      kind: 'academic',
      title: t('lv.gpa', { from: p.gpa.toFixed(1), to: to.toFixed(1) }),
      effort: t('lv.gpaEffort'),
      cost: 2,
      apply: (x) => ({ ...x, gpa: to }),
    });
  }

  // Бюджет — не «усилие ученика», а разговор в семье, поэтому усилие низкое: решается быстро.
  for (const [id, add, cost] of [
    ['budget-1500', 1500, 1],
    ['budget-4000', 4000, 2],
  ] as const) {
    levers.push({
      id,
      group: 'budget',
      kind: 'budget',
      title: t('lv.budget', { from: usd(p.budgetUSD), to: usd(p.budgetUSD + add) }),
      effort: add <= 1500 ? t('lv.budgetEffort1') : t('lv.budgetEffort2'),
      cost,
      apply: (x) => ({ ...x, budgetUSD: x.budgetUSD + add }),
    });
  }

  // Олимпиады: следующий уровень достижений.
  const idx = ACHIEVEMENT_STEPS.indexOf(p.achievements);
  if (idx >= 0 && idx < ACHIEVEMENT_STEPS.length - 1) {
    const to = ACHIEVEMENT_STEPS[idx + 1];
    levers.push({
      id: 'achievement',
      group: 'achievement',
      kind: 'activity',
      title: t('lv.ach', { from: ACHIEVEMENT_LABELS[p.achievements].toLowerCase(), to: ACHIEVEMENT_LABELS[to].toLowerCase() }),
      effort: t('lv.achEffort'),
      cost: 2,
      apply: (x) => ({ ...x, achievements: to }),
    });
  }

  // Расширить географию — ничего не стоит, но часто открывает больше всего.
  if (p.countries.length > 0) {
    levers.push({
      id: 'countries',
      group: 'countries',
      kind: 'scope',
      title: t('lv.countries'),
      effort: t('lv.countriesEffort'),
      cost: 1,
      apply: (x) => ({ ...x, countries: [] }),
    });
  }

  return levers;
}

/** Считает эффект каждого рычага и сортирует по отдаче на единицу усилия. */
export function rankLevers(p: Profile): LeverEffect[] {
  const base = recommend(p);
  const baseIds = new Set(base.eligible.map((r) => r.program.id));
  const baseBands = new Map(base.eligible.map((r) => [r.program.id, BAND_RANK[r.band]]));
  const baseScore = avgTopScore(p);

  const effects = leversFor(p).map<LeverEffect>((lever) => {
    const after = recommend(lever.apply(p));
    const unlocked = after.eligible.filter((r) => !baseIds.has(r.program.id)).map((r) => r.program);
    const bandUpgrades = after.eligible.filter((r) => {
      const before = baseBands.get(r.program.id);
      return before != null && BAND_RANK[r.band] > before;
    }).length;
    const scoreDelta = Math.round((avgTopScore(lever.apply(p)) - baseScore) * 10) / 10;

    // Разблокированная программа весит больше, чем пара очков совпадения:
    // она меняет сам список, а не его порядок.
    const gain = unlocked.length * 10 + bandUpgrades * 4 + Math.max(0, scoreDelta);
    return { lever, unlocked, scoreDelta, bandUpgrades, weight: gain / lever.cost };
  });

  const ranked = effects
    .filter((e) => e.unlocked.length > 0 || e.bandUpgrades > 0 || e.scoreDelta > 0.5)
    .sort((a, b) => b.weight - a.weight || b.unlocked.length - a.unlocked.length);

  // Два шага одного рычага (IELTS +0.5 и +1.0) — это не два разных совета.
  // Оставляем сильнейший в группе, чтобы список читался как набор решений, а не перебор.
  const seen = new Set<Lever['group']>();
  return ranked.filter((e) => {
    if (seen.has(e.lever.group)) return false;
    seen.add(e.lever.group);
    return true;
  });
}
