import { ACHIEVEMENT_LABELS, COUNTRY_LABELS, ENGLISH_TO_IELTS, FIELD_LABELS } from '../data/options';
import { PROGRAMS } from '../data/programs';
import type { Band, Exclusion, Profile, Program, ReasonItem, Recommendation } from '../types';
import { usd } from './format';

export function effectiveIelts(p: Profile): number {
  return p.ielts ?? ENGLISH_TO_IELTS[p.english];
}

/** Years left to improve before applying — younger students get credit for growth. */
function growthCredit(p: Profile): number {
  return p.grade === '9' ? 1 : p.grade === '10' ? 0.5 : 0;
}

export function costWithGrant(prog: Program): number {
  if (prog.grant === 'full') return prog.livingUSD;
  if (prog.grant === 'partial') return Math.round(prog.livingUSD + prog.tuitionUSD * 0.5);
  return prog.tuitionUSD + prog.livingUSD;
}

const ACHIEVEMENT_BONUS = { none: 0, school: 0.1, regional: 0.25, national: 0.5, international: 0.9 };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

interface Academic {
  margin: number;
  band: Band;
  reasons: ReasonItem[];
  gaps: string[];
}

function academicFit(p: Profile, prog: Program): Academic {
  const reasons: ReasonItem[] = [];
  const gaps: string[] = [];
  const margins: number[] = [];
  const growth = growthCredit(p);

  const gpaM = (p.gpa - prog.minGpa) * 2;
  margins.push(gpaM);
  if (gpaM >= 0) reasons.push({ kind: 'plus', text: `Средний балл ${p.gpa.toFixed(1)} не ниже ориентира программы (${prog.minGpa.toFixed(1)}).` });
  else {
    reasons.push({ kind: 'minus', text: `Средний балл ${p.gpa.toFixed(1)} ниже ориентира ${prog.minGpa.toFixed(1)}.` });
    gaps.push(`Поднять средний балл до ${prog.minGpa.toFixed(1)}+`);
  }

  if (prog.minUnt) {
    if (p.untExpected == null) {
      gaps.push(`Сдать пробное ЕНТ: для гранта ориентир от ${prog.minUnt + 15} баллов`);
      margins.push(-0.2);
    } else {
      const m = (p.untExpected - prog.minUnt) / 20;
      margins.push(m);
      if (m >= 0.75) reasons.push({ kind: 'plus', text: `Ожидаемые ${p.untExpected} баллов ЕНТ дают хороший шанс на грант (порог ~${prog.minUnt}).` });
      else if (m >= 0) reasons.push({ kind: 'info', text: `${p.untExpected} баллов ЕНТ проходят порог ~${prog.minUnt}, но за грант будет конкуренция.` });
      else {
        reasons.push({ kind: 'minus', text: `Ожидаемые ${p.untExpected} баллов ЕНТ ниже ориентира ~${prog.minUnt}.` });
        gaps.push(`Поднять ЕНТ до ${prog.minUnt + 15}+ баллов`);
      }
    }
  }

  if (prog.minIelts) {
    const ie = effectiveIelts(p);
    const m = ie + growth - prog.minIelts;
    margins.push(m);
    const src = p.ielts != null ? `IELTS ${p.ielts}` : `уровень ${p.english} (≈IELTS ${ie.toFixed(1)})`;
    if (m >= 0) reasons.push({ kind: 'plus', text: `Английский (${src}) соответствует требованию ${prog.minIelts}.` });
    else {
      reasons.push({ kind: 'minus', text: `Нужен IELTS ${prog.minIelts}, сейчас ${src}.` });
      gaps.push(`Получить IELTS ${prog.minIelts}`);
    }
  }

  if (prog.satRecommended) {
    if (p.sat != null && p.sat >= 1300) {
      margins.push(0.5);
      reasons.push({ kind: 'plus', text: `SAT ${p.sat} усиливает заявку.` });
    } else if (p.sat != null) {
      margins.push(-0.2);
      gaps.push('Поднять SAT до 1300+');
    } else gaps.push('Сдать SAT — университет его рекомендует');
  }

  const bonus = ACHIEVEMENT_BONUS[p.achievements];
  if (bonus >= 0.25) reasons.push({ kind: 'plus', text: `Достижения (${ACHIEVEMENT_LABELS[p.achievements].toLowerCase()}) выделяют заявку.` });
  if (prog.selectivity === 3 && bonus < 0.5) gaps.push('Олимпиады или проекты республиканского уровня заметно помогут');

  const avg = margins.reduce((a, b) => a + b, 0) / margins.length;
  const margin = avg + bonus - (prog.selectivity - 1) * 0.45;
  const band: Band = margin >= 0.55 ? 'safe' : margin >= -0.15 ? 'target' : 'reach';
  return { margin, band, reasons, gaps };
}

export interface RecommendResult {
  eligible: Recommendation[];
  top: Recommendation[];
  exclusions: Exclusion[];
}

export function recommend(p: Profile, programs: Program[] = PROGRAMS): RecommendResult {
  const eligible: Recommendation[] = [];
  const exclusions: Exclusion[] = [];
  const ie = effectiveIelts(p);
  const growth = growthCredit(p);

  for (const prog of programs) {
    const mainMatch = p.interests[0] != null && prog.fields.includes(p.interests[0]);
    const anyMatch = p.interests.some((f) => prog.fields.includes(f));
    if (!anyMatch) continue; // unrelated programs are not "excluded", simply irrelevant

    const full = prog.tuitionUSD + prog.livingUSD;
    const withGrant = costWithGrant(prog);
    const expected = p.needGrant ? withGrant : full;

    if (p.countries.length > 0 && !p.countries.includes(prog.country)) {
      exclusions.push({ program: prog, reason: `Страна не выбрана: ${COUNTRY_LABELS[prog.country]}` });
      continue;
    }
    if (withGrant > p.budgetUSD * 1.5) {
      exclusions.push({ program: prog, reason: `Даже со стипендией ≈${usd(withGrant)}/год при бюджете ${usd(p.budgetUSD)}` });
      continue;
    }
    const englishOnly = prog.language.every((l) => l === 'en');
    if (englishOnly && prog.minIelts && ie + growth < prog.minIelts - 1.5) {
      exclusions.push({ program: prog, reason: `Обучение только на английском, нужен IELTS ${prog.minIelts}` });
      continue;
    }

    const reasons: ReasonItem[] = [];
    const breakdown: Recommendation['breakdown'] = [];

    // 1. Interest (35)
    const fieldScore = mainMatch ? 35 : 12;
    const matched = p.interests.filter((f) => prog.fields.includes(f)).map((f) => FIELD_LABELS[f]);
    reasons.push({ kind: 'plus', text: `Совпадает с ${mainMatch ? 'главным интересом' : 'интересом'}: ${matched.join(', ')}.` });
    breakdown.push({ label: 'Интересы', value: fieldScore, max: 35 });

    // 2. Academic readiness (25)
    const ac = academicFit(p, prog);
    const acScore = Math.round(clamp(13 + ac.margin * 12, 0, 25));
    reasons.push(...ac.reasons);
    breakdown.push({ label: 'Академическая готовность', value: acScore, max: 25 });

    // 3. Budget (20)
    const ratio = expected / Math.max(p.budgetUSD, 1);
    let budgetScore = ratio <= 0.7 ? 20 : ratio <= 1 ? 16 : ratio <= 1.25 ? 8 : 3;
    if (p.needGrant && prog.grant === 'none') budgetScore = Math.min(budgetScore, 6);
    if (ratio <= 1) reasons.push({ kind: 'plus', text: `Вписывается в бюджет: ≈${usd(expected)}/год${p.needGrant && prog.grant !== 'none' ? ' с учётом гранта' : ''}.` });
    else reasons.push({ kind: 'minus', text: `≈${usd(expected)}/год — выше бюджета ${usd(p.budgetUSD)}.` });
    if (prog.grant !== 'none') reasons.push({ kind: 'info', text: prog.grantNote + '.' });
    else if (p.needGrant) reasons.push({ kind: 'minus', text: 'Грантов практически нет — нужно самофинансирование.' });
    breakdown.push({ label: 'Бюджет', value: budgetScore, max: 20 });

    // 4. Language of instruction (10)
    let langScore = 10;
    if (englishOnly && prog.minIelts) {
      const gap = prog.minIelts - (ie + growth);
      langScore = gap <= 0 ? 10 : gap <= 0.5 ? 7 : gap <= 1 ? 5 : 2;
    }
    breakdown.push({ label: 'Язык обучения', value: langScore, max: 10 });

    // 5. Personal priorities (10)
    let prio = p.countries.includes(prog.country) ? 4 : 2;
    const hits: string[] = [];
    if (p.priorities.includes('cost') && expected <= p.budgetUSD * 0.6) { prio += 3; hits.push('низкие расходы'); }
    if (p.priorities.includes('english') && prog.language.includes('en')) { prio += 3; hits.push('обучение на английском'); }
    if (p.priorities.includes('close') && prog.country === 'KZ') { prio += 3; hits.push('близко к дому'); }
    if (p.priorities.includes('prestige') && prog.selectivity === 3) { prio += 3; hits.push('сильный бренд'); }
    if (hits.length) reasons.push({ kind: 'plus', text: `Отвечает вашим приоритетам: ${hits.join(', ')}.` });
    const prioScore = Math.min(prio, 10);
    breakdown.push({ label: 'Ваши приоритеты', value: prioScore, max: 10 });

    const score = fieldScore + acScore + budgetScore + langScore + prioScore;
    eligible.push({
      program: prog,
      score,
      band: ac.band,
      yearlyCostUSD: full,
      costWithGrantUSD: withGrant,
      reasons,
      gaps: ac.gaps,
      breakdown,
    });
  }

  eligible.sort((a, b) => b.score - a.score || a.program.id.localeCompare(b.program.id));
  return { eligible, top: pickTop(eligible), exclusions };
}

/** Top-5 by score, but guarantee a "safe" option and at most 2 programs of one university. */
function pickTop(sorted: Recommendation[]): Recommendation[] {
  const top: Recommendation[] = [];
  const perUni = new Map<string, number>();
  for (const r of sorted) {
    if (top.length >= 5) break;
    const n = perUni.get(r.program.university) ?? 0;
    if (n >= 2) continue;
    perUni.set(r.program.university, n + 1);
    top.push(r);
  }
  if (top.length >= 3 && !top.some((r) => r.band === 'safe')) {
    const safe = sorted.find((r) => r.band === 'safe' && !top.includes(r));
    if (safe) top[top.length - 1] = safe;
  }
  return top;
}

export const BAND_LABELS: Record<Band, { title: string; hint: string }> = {
  safe: { title: 'Надёжный вариант', hint: 'Ваш профиль заметно выше ориентиров программы' },
  target: { title: 'Реалистичный', hint: 'Профиль около ориентиров — шансы есть, если подготовиться' },
  reach: { title: 'Амбициозный', hint: 'Нужно подтянуть показатели, но попробовать стоит' },
};

/** Suggest what to relax when too few matches are found. */
export function relaxHints(p: Profile): string[] {
  const hints: string[] = [];
  const count = (q: Profile) => recommend(q).eligible.length;
  const base = count(p);
  if (p.countries.length > 0) {
    const n = count({ ...p, countries: [] });
    if (n > base) hints.push(`Снимите ограничение по странам — будет вариантов: ${n}`);
  }
  const richer = count({ ...p, budgetUSD: p.budgetUSD + 5000 });
  if (richer > base) hints.push(`Увеличьте бюджет до ${usd(p.budgetUSD + 5000)} — будет вариантов: ${richer}`);
  if (p.interests.length < 3) hints.push('Добавьте ещё одно направление интересов');
  return hints;
}
