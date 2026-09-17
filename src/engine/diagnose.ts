import { ACHIEVEMENT_LABELS, COUNTRY_LABELS, FIELD_LABELS, GRADE_LABELS } from '../data/options';
import type { Profile } from '../types';
import { usd } from './format';
import { effectiveIelts } from './recommend';

export interface Diagnosis {
  headline: string;
  goal: string;
  strengths: string[];
  constraints: string[];
  meters: { label: string; value: number; caption: string }[];
}

export function diagnose(p: Profile): Diagnosis {
  const strengths: string[] = [];
  const constraints: string[] = [];
  const ie = effectiveIelts(p);
  const main = p.interests[0] ? FIELD_LABELS[p.interests[0]] : 'направление не выбрано';
  const abroad = p.countries.length === 0 || p.countries.some((c) => c !== 'KZ');
  const onlyKz = p.countries.length === 1 && p.countries[0] === 'KZ';

  if (p.gpa >= 4.5) strengths.push(`Высокий средний балл (${p.gpa.toFixed(1)}) — подходит даже для конкурсных программ`);
  else if (p.gpa < 4) constraints.push(`Средний балл ${p.gpa.toFixed(1)} ограничивает конкурсные программы — его стоит поднять`);

  if (ie >= 6.5) strengths.push('Английский на уровне, достаточном для большинства зарубежных программ');
  else if (abroad && ie < 5.5) constraints.push('Английского пока не хватает для зарубежных программ — нужен план подготовки к IELTS');

  if (p.untExpected != null && p.untExpected >= 110) strengths.push(`Ожидаемый ЕНТ ${p.untExpected} — сильная позиция в грантовом конкурсе`);
  else if (p.untExpected != null && p.untExpected < 80 && !abroad) constraints.push(`ЕНТ ${p.untExpected} — за грант будет сложно, нужна подготовка`);
  else if (p.untExpected == null && (onlyKz || p.countries.length === 0)) constraints.push('Нет оценки ЕНТ — сдайте пробный тест, чтобы уточнить шансы на грант');

  if (p.achievements === 'national' || p.achievements === 'international')
    strengths.push(`${ACHIEVEMENT_LABELS[p.achievements]} — весомый аргумент для топ-университетов`);
  if (p.interests.length >= 2) strengths.push('Несколько интересов — можно выбрать междисциплинарную программу');

  if (p.needGrant && p.budgetUSD < 5000) constraints.push(`Бюджет до ${usd(p.budgetUSD)}/год — реалистичны в основном грантовые варианты`);
  if (p.grade === '11' || p.grade === 'graduate') constraints.push('Мало времени: заявки большинства программ подаются в ближайшие 4–10 месяцев');
  else strengths.push(`${GRADE_LABELS[p.grade]} — есть время спокойно подготовиться к экзаменам`);

  const where =
    p.countries.length === 0 ? 'в Казахстане или за рубежом' : p.countries.map((c) => COUNTRY_LABELS[c]).join(', ');

  const academic = Math.round(Math.min(100, Math.max(0, ((p.gpa - 3) / 2) * 60 + (p.untExpected ? (p.untExpected / 140) * 40 : 20))));
  const english = Math.round(Math.min(100, (ie / 7.5) * 100));
  const budget = Math.round(Math.min(100, (p.budgetUSD / 20000) * 100));

  return {
    headline: p.name ? `${p.name}, ваш профиль готов` : 'Ваш профиль готов',
    goal: `Поступить на бакалавриат по направлению «${main}» (${where})${p.needGrant ? ' с грантом или стипендией' : ''}.`,
    strengths,
    constraints,
    meters: [
      { label: 'Академическая база', value: academic, caption: `Балл ${p.gpa.toFixed(1)}${p.untExpected ? `, ЕНТ ${p.untExpected}` : ''}` },
      { label: 'Английский', value: english, caption: p.ielts ? `IELTS ${p.ielts}` : `≈IELTS ${ie.toFixed(1)} (самооценка)` },
      { label: 'Финансовая гибкость', value: budget, caption: `до ${usd(p.budgetUSD)}/год` },
    ],
  };
}
