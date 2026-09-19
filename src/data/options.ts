import { t, type Key } from '../i18n';
import type { Achievements, CountryCode, EnglishLevel, Field, Grade, Priority, Profile } from '../types';

/**
 * Справочник, который читается как обычный объект (`FIELD_LABELS[f]`, `Object.keys(...)`),
 * но значение берёт из словаря на текущем языке. Так сотни мест использования
 * остались нетронутыми, а подписи переключаются вместе с языком.
 */
function localized<K extends string>(keys: Record<K, Key>): Record<K, string> {
  return new Proxy(keys, {
    get: (map, prop: string) => (prop in map ? t(map[prop as K]) : undefined),
  }) as unknown as Record<K, string>;
}

export const FIELD_LABELS: Record<Field, string> = localized<Field>({
  cs: 'field.cs',
  engineering: 'field.engineering',
  business: 'field.business',
  medicine: 'field.medicine',
  science: 'field.science',
  social: 'field.social',
  design: 'field.design',
});

export const FIELD_EMOJI: Record<Field, string> = {
  cs: '💻',
  engineering: '⚙️',
  business: '📈',
  medicine: '🩺',
  science: '🔬',
  social: '🌍',
  design: '🎨',
};

export const COUNTRY_LABELS: Record<CountryCode, string> = localized<CountryCode>({
  KZ: 'country.KZ',
  DE: 'country.DE',
  IT: 'country.IT',
  EE: 'country.EE',
  HU: 'country.HU',
  TR: 'country.TR',
  KR: 'country.KR',
  CZ: 'country.CZ',
  UK: 'country.UK',
  US: 'country.US',
});

export const COUNTRY_FLAG: Record<CountryCode, string> = {
  KZ: '🇰🇿', DE: '🇩🇪', IT: '🇮🇹', EE: '🇪🇪', HU: '🇭🇺', TR: '🇹🇷', KR: '🇰🇷', CZ: '🇨🇿', UK: '🇬🇧', US: '🇺🇸',
};

export const GRADE_LABELS: Record<Grade, string> = localized<Grade>({
  '9': 'grade.9',
  '10': 'grade.10',
  '11': 'grade.11',
  graduate: 'grade.graduate',
});

export const ENGLISH_LABELS: Record<EnglishLevel, string> = localized<EnglishLevel>({
  none: 'english.none',
  A2: 'english.A2',
  B1: 'english.B1',
  B2: 'english.B2',
  C1: 'english.C1',
});

export const ACHIEVEMENT_LABELS: Record<Achievements, string> = localized<Achievements>({
  none: 'ach.none',
  school: 'ach.school',
  regional: 'ach.regional',
  national: 'ach.national',
  international: 'ach.international',
});

export const PRIORITY_LABELS: Record<Priority, string> = localized<Priority>({
  cost: 'prio.cost',
  prestige: 'prio.prestige',
  english: 'prio.english',
  close: 'prio.close',
});

/** Rough IELTS equivalent of a self-reported CEFR level (used only when no IELTS score). */
export const ENGLISH_TO_IELTS: Record<EnglishLevel, number> = {
  none: 0,
  A2: 4.0,
  B1: 5.0,
  B2: 6.0,
  C1: 7.0,
};

export const EMPTY_PROFILE: Profile = {
  name: '',
  grade: '11',
  interests: [],
  gpa: 4.5,
  untExpected: null,
  english: 'B1',
  ielts: null,
  sat: null,
  countries: [],
  budgetUSD: 6000,
  needGrant: true,
  achievements: 'none',
  priorities: ['cost'],
};

/** Готовый профиль для быстрого знакомства: реальный по структуре 11-классник из Алматы. */
export const SAMPLE_PROFILE: Profile = {
  name: 'Алия',
  grade: '11',
  interests: ['cs', 'engineering'],
  gpa: 4.6,
  untExpected: 105,
  english: 'B2',
  ielts: null,
  sat: null,
  countries: ['KZ', 'HU', 'EE', 'IT'],
  budgetUSD: 8000,
  needGrant: true,
  achievements: 'regional',
  priorities: ['cost', 'english'],
};
