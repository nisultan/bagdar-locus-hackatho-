import { ACHIEVEMENT_LABELS, COUNTRY_LABELS, FIELD_LABELS, GRADE_LABELS } from '../data/options';
import type { Profile } from '../types';
import { usd } from './format';
import { t } from '../i18n';
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
  const main = p.interests[0] ? FIELD_LABELS[p.interests[0]] : t('d.noField');
  const abroad = p.countries.length === 0 || p.countries.some((c) => c !== 'KZ');
  const onlyKz = p.countries.length === 1 && p.countries[0] === 'KZ';

  if (p.gpa >= 4.5) strengths.push(t('d.gpaHigh', { gpa: p.gpa.toFixed(1) }));
  else if (p.gpa < 4) constraints.push(t('d.gpaLow', { gpa: p.gpa.toFixed(1) }));

  if (ie >= 6.5) strengths.push(t('d.engOk'));
  else if (abroad && ie < 5.5) constraints.push(t('d.engLow'));

  if (p.untExpected != null && p.untExpected >= 110) strengths.push(t('d.untHigh', { unt: p.untExpected }));
  else if (p.untExpected != null && p.untExpected < 80 && !abroad) constraints.push(t('d.untLow', { unt: p.untExpected }));
  else if (p.untExpected == null && (onlyKz || p.countries.length === 0)) constraints.push(t('d.untNone'));

  if (p.achievements === 'national' || p.achievements === 'international')
    strengths.push(t('d.ach', { level: ACHIEVEMENT_LABELS[p.achievements] }));
  if (p.interests.length >= 2) strengths.push(t('d.multiInterest'));

  if (p.needGrant && p.budgetUSD < 5000) constraints.push(t('d.budgetTight', { budget: usd(p.budgetUSD) }));
  if (p.grade === '11' || p.grade === 'graduate') constraints.push(t('d.timeShort'));
  else strengths.push(t('d.timeOk', { grade: GRADE_LABELS[p.grade] }));

  const where =
    p.countries.length === 0 ? t('d.whereAny') : p.countries.map((c) => COUNTRY_LABELS[c]).join(', ');

  const academic = Math.round(Math.min(100, Math.max(0, ((p.gpa - 3) / 2) * 60 + (p.untExpected ? (p.untExpected / 140) * 40 : 20))));
  const english = Math.round(Math.min(100, (ie / 7.5) * 100));
  const budget = Math.round(Math.min(100, (p.budgetUSD / 20000) * 100));

  return {
    headline: p.name ? t('d.headlineName', { name: p.name }) : t('d.headline'),
    goal: t('d.goal', { field: main, where, grant: p.needGrant ? t('d.goalGrant') : '' }),
    strengths,
    constraints,
    meters: [
      { label: t('d.meterAcademic'), value: academic, caption: t('d.meterAcademicCap', { gpa: p.gpa.toFixed(1), unt: p.untExpected ? t('d.meterAcademicUnt', { unt: p.untExpected }) : '' }) },
      { label: t('d.meterEnglish'), value: english, caption: p.ielts ? `IELTS ${p.ielts}` : t('d.meterEnglishSelf', { ielts: ie.toFixed(1) }) },
      { label: t('d.meterBudget'), value: budget, caption: t('d.meterBudgetCap', { budget: usd(p.budgetUSD) }) },
    ],
  };
}
