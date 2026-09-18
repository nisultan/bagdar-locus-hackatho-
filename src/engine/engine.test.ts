import { describe, expect, it } from 'vitest';
import { DEMO_PROFILE } from '../data/options';
import { PROGRAMS } from '../data/programs';
import { diagnose } from './diagnose';
import { leversFor, rankLevers } from './leverage';
import { recommend } from './recommend';
import { buildRoadmap, intakeYear, nextTask } from './roadmap';

const NOW = new Date(2026, 8, 17);

describe('recommend', () => {
  it('returns at least 3 explained recommendations for the demo profile', () => {
    const r = recommend(DEMO_PROFILE);
    expect(r.top.length).toBeGreaterThanOrEqual(3);
    for (const rec of r.top) {
      expect(rec.reasons.length).toBeGreaterThan(0);
      expect(rec.score).toBeGreaterThan(0);
      expect(rec.score).toBeLessThanOrEqual(100);
    }
  });

  it('changes results when the interest changes', () => {
    const cs = recommend(DEMO_PROFILE).top.map((r) => r.program.id);
    const med = recommend({ ...DEMO_PROFILE, interests: ['medicine'] }).top.map((r) => r.program.id);
    expect(med).not.toEqual(cs);
    expect(med.every((id) => PROGRAMS.find((p) => p.id === id)!.fields.includes('medicine'))).toBe(true);
  });

  it('shows foreign programs once English and budget allow it (README jury scenario)', () => {
    const base = { ...DEMO_PROFILE, countries: [], english: 'B1' as const, budgetUSD: 6000, ielts: null };
    const upgraded = recommend({ ...base, ielts: 6.5, budgetUSD: 20000 });
    const abroad = (r: ReturnType<typeof recommend>) => r.eligible.filter((x) => x.program.country !== 'KZ').length;
    expect(abroad(upgraded)).toBeGreaterThan(abroad(recommend(base)));
    expect(upgraded.top.some((x) => x.program.country !== 'KZ')).toBe(true);
  });

  it('respects the country filter and reports exclusions', () => {
    const r = recommend({ ...DEMO_PROFILE, countries: ['KZ'] });
    expect(r.eligible.every((x) => x.program.country === 'KZ')).toBe(true);
    expect(r.exclusions.some((e) => e.reason.startsWith('Страна'))).toBe(true);
  });

  it('excludes programs far above the budget', () => {
    const r = recommend({ ...DEMO_PROFILE, countries: [], budgetUSD: 5000 });
    expect(r.eligible.find((x) => x.program.id === 'manchester-cs')).toBeUndefined();
    const rich = recommend({ ...DEMO_PROFILE, countries: [], budgetUSD: 60000, needGrant: false, ielts: 7 });
    expect(rich.eligible.find((x) => x.program.id === 'manchester-cs')).toBeDefined();
  });

  it('a stronger profile never gets a worse band', () => {
    const rank = { reach: 0, target: 1, safe: 2 };
    const weak = recommend({ ...DEMO_PROFILE, gpa: 3.8, untExpected: 70 });
    const strong = recommend({ ...DEMO_PROFILE, gpa: 5, untExpected: 130, achievements: 'international' });
    for (const w of weak.eligible) {
      const s = strong.eligible.find((x) => x.program.id === w.program.id);
      if (s) expect(rank[s.band]).toBeGreaterThanOrEqual(rank[w.band]);
    }
  });
});

describe('roadmap', () => {
  it('computes intake year by grade', () => {
    expect(intakeYear({ ...DEMO_PROFILE, grade: '11' }, NOW)).toBe(2027);
    expect(intakeYear({ ...DEMO_PROFILE, grade: '9' }, NOW)).toBe(2029);
  });

  it('builds sorted tasks with a next step and no past dates', () => {
    const short = recommend(DEMO_PROFILE).top.slice(0, 3).map((r) => r.program);
    const { tasks } = buildRoadmap(DEMO_PROFILE, short, NOW);
    expect(tasks.length).toBeGreaterThan(5);
    const dues = tasks.map((t) => t.due);
    expect([...dues].sort()).toEqual(dues);
    expect(dues.every((d) => d >= '2026-09-01')).toBe(true);
    const first = nextTask(tasks, {});
    expect(first).not.toBeNull();
    expect(nextTask(tasks, { [first!.id]: true })!.id).not.toBe(first!.id);
  });
});

describe('diagnose', () => {
  it('produces a goal and meters', () => {
    const d = diagnose(DEMO_PROFILE);
    expect(d.goal).toContain('IT');
    expect(d.meters).toHaveLength(3);
  });
});

describe('leverage', () => {
  it('ranks levers and every claimed unlock really becomes eligible', () => {
    const effects = rankLevers(DEMO_PROFILE);
    expect(effects.length).toBeGreaterThan(0);

    const baseIds = new Set(recommend(DEMO_PROFILE).eligible.map((r) => r.program.id));
    for (const e of effects) {
      const afterIds = new Set(recommend(e.lever.apply(DEMO_PROFILE)).eligible.map((r) => r.program.id));
      for (const prog of e.unlocked) {
        // разблокированная программа обязана отсутствовать до и присутствовать после
        expect(baseIds.has(prog.id)).toBe(false);
        expect(afterIds.has(prog.id)).toBe(true);
      }
    }
  });

  it('is sorted by payoff per unit of effort', () => {
    const weights = rankLevers(DEMO_PROFILE).map((e) => e.weight);
    expect([...weights].sort((a, b) => b - a)).toEqual(weights);
  });

  it('never offers a lever the student cannot pull', () => {
    const maxed = { ...DEMO_PROFILE, ielts: 8, untExpected: 140, gpa: 5, grade: 'graduate' as const };
    const ids = leversFor(maxed).map((l) => l.id);
    expect(ids).not.toContain('ielts-05');
    expect(ids).not.toContain('ielts-10');
    expect(ids).not.toContain('unt-10');
    expect(ids).not.toContain('gpa');
  });

  it('does not invent effects: applying a lever cannot shrink the eligible list', () => {
    for (const e of rankLevers(DEMO_PROFILE)) {
      const before = recommend(DEMO_PROFILE).eligible.length;
      const after = recommend(e.lever.apply(DEMO_PROFILE)).eligible.length;
      expect(after).toBeGreaterThanOrEqual(before);
    }
  });
});

describe('leverage grouping', () => {
  it('shows one lever per profile field, not every step of it', () => {
    const groups = rankLevers(DEMO_PROFILE).map((e) => e.lever.group);
    expect(new Set(groups).size).toBe(groups.length);
  });
});
