import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { diagnose, type Diagnosis } from '../engine/diagnose';
import { useLang } from '../i18n/useLang';
import { leversFor } from '../engine/leverage';
import { recommend, type RecommendResult } from '../engine/recommend';
import { buildRoadmap, nextTask, type Roadmap } from '../engine/roadmap';
import { EMPTY_PROFILE } from '../data/options';
import { PROGRAMS } from '../data/programs';
import type { Profile, RoadmapTask } from '../types';

const KEY = 'bagdar:v1';
/** Ключ до переименования продукта: читаем один раз, чтобы не обнулить начатый маршрут. */
const LEGACY_KEY = 'unipath:v1';

export interface Change {
  added: string[];
  removed: string[];
  at: number;
}

export interface State {
  profile: Profile;
  profileDone: boolean;
  shortlist: string[]; // program ids used to build roadmap
  shortlistTouched: boolean; // user edited shortlist manually
  compare: string[];
  done: Record<string, boolean>;
  visited: string[]; // stages reached
  change: Change | null;
  /** Примеряемый рычаг: список пересобирается, но сам профиль не меняется. Не сохраняется. */
  preview: string | null;
}

const INITIAL: State = {
  profile: EMPTY_PROFILE,
  profileDone: false,
  shortlist: [],
  shortlistTouched: false,
  compare: [],
  done: {},
  visited: ['start'],
  change: null,
  preview: null,
};

type Action =
  | { type: 'saveProfile'; profile: Profile }
  | { type: 'toggleShortlist'; id: string }
  | { type: 'toggleCompare'; id: string }
  | { type: 'toggleDone'; id: string }
  | { type: 'visit'; stage: string }
  | { type: 'dismissChange' }
  | { type: 'previewLever'; id: string | null }
  | { type: 'applyLever'; id: string }
  | { type: 'reset' };

const topIds = (p: Profile) => recommend(p).top.map((r) => r.program.id);

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'saveProfile': {
      const next = topIds(a.profile);
      const valid = new Set(recommend(a.profile).eligible.map((r) => r.program.id));
      let change: Change | null = null;
      if (s.profileDone) {
        const prev = topIds(s.profile);
        const added = next.filter((id) => !prev.includes(id));
        const removed = prev.filter((id) => !next.includes(id));
        if (added.length || removed.length) change = { added, removed, at: Date.now() };
      }
      const keptShortlist = s.shortlist.filter((id) => valid.has(id));
      const shortlist = s.shortlistTouched && keptShortlist.length > 0 ? keptShortlist : next.slice(0, 3);
      return {
        ...s,
        profile: a.profile,
        profileDone: true,
        shortlist,
        shortlistTouched: s.shortlistTouched && keptShortlist.length > 0,
        compare: s.compare.filter((id) => valid.has(id)),
        change,
      };
    }
    case 'toggleShortlist': {
      const has = s.shortlist.includes(a.id);
      return { ...s, shortlistTouched: true, shortlist: has ? s.shortlist.filter((x) => x !== a.id) : [...s.shortlist, a.id] };
    }
    case 'toggleCompare': {
      const has = s.compare.includes(a.id);
      const compare = has ? s.compare.filter((x) => x !== a.id) : [...s.compare, a.id].slice(-3);
      return { ...s, compare };
    }
    case 'toggleDone':
      return { ...s, done: { ...s.done, [a.id]: !s.done[a.id] } };
    case 'visit':
      return s.visited.includes(a.stage) ? s : { ...s, visited: [...s.visited, a.stage] };
    case 'dismissChange':
      return { ...s, change: null };
    case 'previewLever':
      return { ...s, preview: a.id };
    case 'applyLever': {
      // «Примерил и решил идти» — рычаг становится настоящей целью в профиле.
      const lever = leversFor(s.profile).find((l) => l.id === a.id);
      if (!lever) return { ...s, preview: null };
      return reducer({ ...s, preview: null }, { type: 'saveProfile', profile: lever.apply(s.profile) });
    }
    case 'reset':
      return INITIAL;
  }
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return INITIAL;
    const parsed = JSON.parse(raw) as Partial<State>;
    if (!parsed.profile || !Array.isArray(parsed.profile.interests)) return INITIAL;
    return { ...INITIAL, ...parsed, profile: { ...EMPTY_PROFILE, ...parsed.profile }, change: null, preview: null };
  } catch {
    return INITIAL;
  }
}

export interface Derived {
  recs: RecommendResult;
  /** Профиль, по которому построен текущий список: настоящий или с примеренным рычагом. */
  activeProfile: Profile;
  diagnosis: Diagnosis;
  roadmap: Roadmap;
  next: RoadmapTask | null;
  progress: { done: number; total: number };
}

interface Ctx {
  state: State;
  dispatch: (a: Action) => void;
  derived: Derived;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  // Движок строит причины, пробелы и задачи плана текстом на текущем языке,
  // поэтому смена языка обязана пересчитать derived — иначе интерфейс
  // переключается, а объяснения остаются на старом языке.
  const lang = useLang();

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable (private mode) — app keeps working in memory */
    }
  }, [state]);

  const derived = useMemo<Derived>(() => {
    // Примерка влияет только на список рекомендаций: план и прогресс остаются
    // привязанными к настоящему профилю, иначе пользователь потеряет ориентир.
    const lever = state.preview ? leversFor(state.profile).find((l) => l.id === state.preview) : undefined;
    const activeProfile = lever ? lever.apply(state.profile) : state.profile;
    const recs = recommend(activeProfile);
    const shortlist = state.shortlist.map((id) => PROGRAMS.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p);
    const roadmap = buildRoadmap(state.profile, shortlist, new Date());
    const doneCount = roadmap.tasks.filter((t) => state.done[t.id]).length;
    return {
      recs,
      activeProfile,
      diagnosis: diagnose(state.profile),
      roadmap,
      next: nextTask(roadmap.tasks, state.done),
      progress: { done: doneCount, total: roadmap.tasks.length },
    };
  }, [state.profile, state.shortlist, state.done, state.preview, lang]);

  return <StoreCtx.Provider value={{ state, dispatch, derived }}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore outside StoreProvider');
  return ctx;
}
