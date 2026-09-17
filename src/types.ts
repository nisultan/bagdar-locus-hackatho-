export type Field =
  | 'cs'
  | 'engineering'
  | 'business'
  | 'medicine'
  | 'science'
  | 'social'
  | 'design';

export type CountryCode = 'KZ' | 'DE' | 'IT' | 'EE' | 'HU' | 'TR' | 'KR' | 'CZ' | 'UK' | 'US';

export type EnglishLevel = 'none' | 'A2' | 'B1' | 'B2' | 'C1';
export type Grade = '9' | '10' | '11' | 'graduate';
export type Achievements = 'none' | 'school' | 'regional' | 'national' | 'international';
export type Priority = 'cost' | 'prestige' | 'english' | 'close';

export interface Profile {
  name: string;
  grade: Grade;
  interests: Field[]; // first one is the main interest
  gpa: number; // 5-point school scale
  untExpected: number | null; // ЕНТ, max 140
  english: EnglishLevel;
  ielts: number | null;
  sat: number | null;
  countries: CountryCode[]; // empty = open to any
  budgetUSD: number; // max per year incl. living
  needGrant: boolean;
  achievements: Achievements;
  priorities: Priority[];
}

export type Language = 'en' | 'ru' | 'kz' | 'de';

export interface Program {
  id: string;
  university: string;
  program: string;
  city: string;
  country: CountryCode;
  fields: Field[];
  language: Language[];
  tuitionUSD: number; // per year, approximate, for international / paid track
  livingUSD: number; // per year, approximate
  grant: 'full' | 'partial' | 'none'; // availability of merit/state funding for this audience
  grantNote: string;
  selectivity: 1 | 2 | 3; // 1 = accessible, 3 = highly competitive
  minGpa: number;
  minUnt?: number;
  minIelts?: number;
  satRecommended?: boolean;
  entrance: string; // how admission works, short
  deadline: { month: number; label: string }; // typical cycle, NOT a verified date
  sourceUrl: string;
  highlights: string[];
}

export type Band = 'safe' | 'target' | 'reach';

export interface ReasonItem {
  kind: 'plus' | 'minus' | 'info';
  text: string;
}

export interface Recommendation {
  program: Program;
  score: number; // 0..100 fit score
  band: Band;
  yearlyCostUSD: number;
  costWithGrantUSD: number;
  reasons: ReasonItem[];
  gaps: string[]; // what to improve to become eligible / stronger
  breakdown: { label: string; value: number; max: number }[];
}

export interface Exclusion {
  program: Program;
  reason: string;
}

export type TaskCategory = 'exam' | 'document' | 'deadline' | 'academic' | 'activity';

export interface RoadmapTask {
  id: string;
  title: string;
  why: string;
  category: TaskCategory;
  due: string; // ISO yyyy-mm-01
  sourceUrl?: string;
  demo: boolean; // true when date is an estimate from demo data
  relatedProgramId?: string;
}
