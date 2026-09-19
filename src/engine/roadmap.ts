import { t, type Key } from '../i18n';
import { COUNTRY_LABELS } from '../data/options';
import type { Profile, Program, RoadmapTask } from '../types';
import { isoMonth } from './format';
import { effectiveIelts } from './recommend';

export const SOURCES = {
  unt: 'https://testcenter.kz/',
  ielts: 'https://ielts.org/',
  sat: 'https://satsuite.collegeboard.org/sat',
  grants: 'https://www.gov.kz/',
};

export interface Roadmap {
  intakeYear: number;
  tasks: RoadmapTask[];
}

/** School graduation (and university intake) year for the profile. */
export function intakeYear(p: Profile, now: Date): number {
  const schoolYearEnd = now.getMonth() + 1 >= 9 ? now.getFullYear() + 1 : now.getFullYear();
  const offset = p.grade === '9' ? 2 : p.grade === '10' ? 1 : 0;
  return schoolYearEnd + offset;
}

/** Date of a typical deadline month inside the application cycle that ends with intake. */
function cycleDate(month: number, intake: number) {
  return isoMonth(month >= 9 ? intake - 1 : intake, month);
}

const addMonths = (iso: string, delta: number) => {
  const [y, m] = iso.split('-').map(Number);
  const t = y * 12 + (m - 1) + delta;
  return isoMonth(Math.floor(t / 12), (t % 12) + 1);
};

export function buildRoadmap(p: Profile, shortlist: Program[], now: Date): Roadmap {
  const intake = intakeYear(p, now);
  const nowIso = isoMonth(now.getFullYear(), now.getMonth() + 1);
  const tasks: RoadmapTask[] = [];
  const ie = effectiveIelts(p);

  // ENT-based admission vs. application-based (essays, recommendations) — NU uses its own process
  const kz = shortlist.filter((s) => s.minUnt != null);
  const abroad = shortlist.filter((s) => s.minUnt == null);

  // Deadlines of chosen programs
  for (const prog of shortlist) {
    tasks.push({
      id: `deadline-${prog.id}`,
      title: t('rm.applyT', { uni: prog.university }),
      why: t('rm.applyW', { program: prog.program, entrance: prog.entrance, deadline: prog.deadline.label }),
      category: 'deadline',
      due: cycleDate(prog.deadline.month, intake),
      sourceUrl: prog.sourceUrl,
      estimated: true,
      relatedProgramId: prog.id,
    });
  }

  const deadlines = tasks.map((t) => t.due).sort();
  const earliest = deadlines[0] ?? isoMonth(intake, 6);
  const earliestAbroad = abroad.map((a) => cycleDate(a.deadline.month, intake)).sort()[0];

  // Exams
  if (kz.length > 0) {
    const need = Math.max(...kz.map((k) => (k.minUnt ?? 70) + 15));
    tasks.push({
      id: 'unt-mock',
      title: t('rm.untTrialT'),
      why: p.untExpected == null
        ? t('rm.untTrialW1')
        : t('rm.untTrialW2', { now: p.untExpected, need }),
      category: 'exam',
      due: addMonths(nowIso, 1),
      sourceUrl: SOURCES.unt,
      estimated: false,
    });
    tasks.push({
      id: 'unt-main',
      title: t('rm.untMainT'),
      why: t('rm.untMainW', { need }),
      category: 'exam',
      due: isoMonth(intake, 5),
      sourceUrl: SOURCES.unt,
      estimated: true,
    });
    tasks.push({
      id: 'grant-contest',
      title: t('rm.grantT'),
      why: t('rm.grantW', { list: kz.map((k) => k.university).join(', ') }),
      category: 'deadline',
      due: isoMonth(intake, 7),
      sourceUrl: SOURCES.grants,
      estimated: true,
    });
  }

  const ieltsTarget = Math.max(0, ...shortlist.map((s) => s.minIelts ?? 0));
  if (ieltsTarget > 0) {
    const examBy = addMonths(earliestAbroad ?? earliest, -2);
    if (p.ielts == null || p.ielts < ieltsTarget) {
      tasks.push({
        id: 'ielts-prep',
        title: t('rm.ieltsPrepT', { target: ieltsTarget }),
        why: t('rm.ieltsPrepW', { now: ie.toFixed(1) }),
        category: 'exam',
        due: addMonths(examBy, -3),
        sourceUrl: SOURCES.ielts,
        estimated: false,
      });
      tasks.push({
        id: 'ielts-exam',
        title: t('rm.ieltsTakeT', { target: ieltsTarget }),
        why: t('rm.ieltsTakeW'),
        category: 'exam',
        due: examBy,
        sourceUrl: SOURCES.ielts,
        estimated: false,
      });
    }
  }

  if (shortlist.some((s) => s.satRecommended) && (p.sat == null || p.sat < 1300)) {
    tasks.push({
      id: 'sat',
      title: t('rm.satT'),
      why: t('rm.satW', { list: shortlist.filter((s) => s.satRecommended).map((s) => s.university).join(', ') }),
      category: 'exam',
      due: addMonths(earliestAbroad ?? earliest, -3),
      sourceUrl: SOURCES.sat,
      estimated: false,
    });
  }

  // Documents
  const docsBy = addMonths(earliestAbroad ?? earliest, -1);
  tasks.push({
    id: 'docs-transcript',
    title: t('rm.transcriptT'),
    why: t('rm.transcriptW'),
    category: 'document',
    due: addMonths(docsBy, -1),
    estimated: false,
  });
  const foreign = shortlist.filter((s) => s.country !== 'KZ');
  if (foreign.length > 0) {
    tasks.push({
      id: 'docs-passport',
      title: t('rm.passportT'),
      why: t('rm.passportW', { list: [...new Set(foreign.map((a) => COUNTRY_LABELS[a.country]))].join(', ') }),
      category: 'document',
      due: addMonths(nowIso, 1),
      estimated: false,
    });
  }
  if (abroad.length > 0) {
    tasks.push({
      id: 'docs-motivation',
      title: t('rm.essayT'),
      why: t('rm.essayW'),
      category: 'document',
      due: docsBy,
      estimated: false,
    });
    tasks.push({
      id: 'docs-recommendations',
      title: t('rm.refsT'),
      why: t('rm.refsW'),
      category: 'document',
      due: docsBy,
      estimated: false,
    });
  }

  // Academics
  const maxGpa = Math.max(0, ...shortlist.map((s) => s.minGpa));
  if (p.gpa < maxGpa) {
    tasks.push({
      id: 'gpa',
      title: t('rm.gpaT', { target: maxGpa.toFixed(1) }),
      why: t('rm.gpaW', { now: p.gpa.toFixed(1) }),
      category: 'academic',
      due: addMonths(nowIso, 3),
      estimated: false,
    });
  }
  tasks.push({
    id: 'shortlist-review',
    title: t('rm.verifyT'),
    why: t('rm.verifyW'),
    category: 'academic',
    due: nowIso,
    estimated: false,
  });

  // Activities by main interest
  const activity: Record<string, [Key, Key]> = {
    cs: ['act.cs', 'act.csW'],
    engineering: ['act.engineering', 'act.engineeringW'],
    business: ['act.business', 'act.businessW'],
    medicine: ['act.medicine', 'act.medicineW'],
    science: ['act.science', 'act.scienceW'],
    social: ['act.social', 'act.socialW'],
    design: ['act.design', 'act.designW'],
  };
  const main = p.interests[0];
  if (main) {
    const [titleKey, whyKey] = activity[main];
    tasks.push({ id: `activity-${main}`, title: t(titleKey), why: t(whyKey), category: 'activity', due: addMonths(nowIso, 2), estimated: false });
  }

  // Overdue estimates become "as soon as possible"
  for (const t of tasks) if (t.due < nowIso) t.due = nowIso;

  tasks.sort((a, b) => a.due.localeCompare(b.due) || order(a) - order(b));
  return { intakeYear: intake, tasks };
}

const ORDER = { academic: 0, document: 1, exam: 2, activity: 3, deadline: 4 };
const order = (t: RoadmapTask) => ORDER[t.category];

export function nextTask(tasks: RoadmapTask[], done: Record<string, boolean>) {
  return tasks.find((t) => !done[t.id]) ?? null;
}
