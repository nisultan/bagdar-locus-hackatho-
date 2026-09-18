import type { Achievements, CountryCode, EnglishLevel, Field, Grade, Priority, Profile } from '../types';

export const FIELD_LABELS: Record<Field, string> = {
  cs: 'IT и программирование',
  engineering: 'Инженерия',
  business: 'Бизнес и экономика',
  medicine: 'Медицина',
  science: 'Естественные науки',
  social: 'Общество и международные отношения',
  design: 'Дизайн и медиа',
};

export const FIELD_EMOJI: Record<Field, string> = {
  cs: '💻',
  engineering: '⚙️',
  business: '📈',
  medicine: '🩺',
  science: '🔬',
  social: '🌍',
  design: '🎨',
};

export const COUNTRY_LABELS: Record<CountryCode, string> = {
  KZ: 'Казахстан',
  DE: 'Германия',
  IT: 'Италия',
  EE: 'Эстония',
  HU: 'Венгрия',
  TR: 'Турция',
  KR: 'Южная Корея',
  CZ: 'Чехия',
  UK: 'Великобритания',
  US: 'США',
};

export const COUNTRY_FLAG: Record<CountryCode, string> = {
  KZ: '🇰🇿', DE: '🇩🇪', IT: '🇮🇹', EE: '🇪🇪', HU: '🇭🇺', TR: '🇹🇷', KR: '🇰🇷', CZ: '🇨🇿', UK: '🇬🇧', US: '🇺🇸',
};

export const GRADE_LABELS: Record<Grade, string> = {
  '9': '9 класс',
  '10': '10 класс',
  '11': '11 класс',
  graduate: 'Уже окончил(а) школу',
};

export const ENGLISH_LABELS: Record<EnglishLevel, string> = {
  none: 'Почти не знаю',
  A2: 'A2 — базовый',
  B1: 'B1 — средний',
  B2: 'B2 — уверенный',
  C1: 'C1 — свободный',
};

export const ACHIEVEMENT_LABELS: Record<Achievements, string> = {
  none: 'Пока нет',
  school: 'Школьные олимпиады / проекты',
  regional: 'Городской или областной уровень',
  national: 'Республиканский уровень',
  international: 'Международный уровень',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  cost: 'Минимальные расходы',
  prestige: 'Сильный бренд университета',
  english: 'Обучение на английском',
  close: 'Учиться ближе к дому',
};

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
