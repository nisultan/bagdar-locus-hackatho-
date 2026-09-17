import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { diagnose, type Diagnosis } from '../engine/diagnose';
import { recommend, type RecommendResult } from '../engine/recommend';
import { buildRoadmap, nextTask, type Roadmap } from '../engine/roadmap';
import { EMPTY_PROFILE } from '../data/options';
import { PROGRAMS } from '../data/programs';
import type { Profile, RoadmapTask } from '../types';

const KEY = 'unipath:v1';

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
};

type Action =
  | { type: 'saveProfile'; profile: Profile }
  | { type: 'toggleShortlist'; id: string }
  | { type: 'toggleCompare'; id: string }
  | { type: 'toggleDone'; id: string }
  | { type: 'visit'; stage: string }
  | { type: 'dismissChange' }
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
    case 'reset':
      return INITIAL;
  }
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return INITIAL;
    const parsed = JSON.parse(raw) as Partial<State>;
    if (!parsed.profile || !Array.isArray(parsed.profile.interests)) return INITIAL;
    return { ...INITIAL, ...parsed, profile: { ...EMPTY_PROFILE, ...parsed.profile }, change: null };
  } catch {
    return INITIAL;
  }
}

export interface Derived {
  recs: RecommendResult;
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

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable (private mode) — app keeps working in memory */
    }
  }, [state]);

  const derived = useMemo<Derived>(() => {
    const recs = recommend(state.profile);
    const shortlist = state.shortlist.map((id) => PROGRAMS.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p);
    const roadmap = buildRoadmap(state.profile, shortlist, new Date());
    const doneCount = roadmap.tasks.filter((t) => state.done[t.id]).length;
    return {
      recs,
      diagnosis: diagnose(state.profile),
      roadmap,
      next: nextTask(roadmap.tasks, state.done),
      progress: { done: doneCount, total: roadmap.tasks.length },
    };
  }, [state.profile, state.shortlist, state.done]);

  return <StoreCtx.Provider value={{ state, dispatch, derived }}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore outside StoreProvider');
  return ctx;
}
