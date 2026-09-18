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
      title: `Подать заявку: ${prog.university}`,
      why: `${prog.program}. ${prog.entrance}. Срок ${prog.deadline.label}.`,
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
      title: 'Сдать пробное ЕНТ по профильным предметам',
      why: p.untExpected == null
        ? 'Без реальной оценки нельзя честно посчитать шансы на грант.'
        : `Сейчас ожидается ${p.untExpected}, цель для гранта — ${need}+.`,
      category: 'exam',
      due: addMonths(nowIso, 1),
      sourceUrl: SOURCES.unt,
      estimated: false,
    });
    tasks.push({
      id: 'unt-main',
      title: 'Основное ЕНТ',
      why: `Цель — ${need}+ баллов. Точные даты регистрации и тестирования публикует Национальный центр тестирования.`,
      category: 'exam',
      due: isoMonth(intake, 5),
      sourceUrl: SOURCES.unt,
      estimated: true,
    });
    tasks.push({
      id: 'grant-contest',
      title: 'Подать заявление на государственный грант',
      why: `Укажите в заявлении: ${kz.map((k) => k.university).join(', ')}.`,
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
        title: `Подготовка к IELTS: цель ${ieltsTarget}`,
        why: `Сейчас ≈${ie.toFixed(1)}. Обычно +0.5 балла требует 2–3 месяца регулярных занятий.`,
        category: 'exam',
        due: addMonths(examBy, -3),
        sourceUrl: SOURCES.ielts,
        estimated: false,
      });
      tasks.push({
        id: 'ielts-exam',
        title: `Сдать IELTS на ${ieltsTarget}+`,
        why: 'Результат приходит примерно через 1–2 недели — сдавайте с запасом до дедлайна.',
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
      title: 'Сдать SAT (цель 1300+)',
      why: `Рекомендуют: ${shortlist.filter((s) => s.satRecommended).map((s) => s.university).join(', ')}.`,
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
    title: 'Запросить в школе транскрипт оценок',
    why: 'Нужен почти для всех заявок; для зарубежных вузов — с нотариальным переводом.',
    category: 'document',
    due: addMonths(docsBy, -1),
    estimated: false,
  });
  const foreign = shortlist.filter((s) => s.country !== 'KZ');
  if (foreign.length > 0) {
    tasks.push({
      id: 'docs-passport',
      title: 'Проверить загранпаспорт',
      why: `Для учёбы за рубежом (${[...new Set(foreign.map((a) => COUNTRY_LABELS[a.country]))].join(', ')}) паспорт должен действовать весь период подачи и визы.`,
      category: 'document',
      due: addMonths(nowIso, 1),
      estimated: false,
    });
  }
  if (abroad.length > 0) {
    tasks.push({
      id: 'docs-motivation',
      title: 'Написать мотивационное письмо',
      why: 'Объясните, почему именно эта программа и как она связана с вашими интересами. Начните с черновика — нужно 3–4 итерации.',
      category: 'document',
      due: docsBy,
      estimated: false,
    });
    tasks.push({
      id: 'docs-recommendations',
      title: 'Попросить 2 рекомендательных письма у учителей',
      why: 'Учителям нужно время — попросите минимум за месяц до дедлайна.',
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
      title: `Поднять средний балл до ${maxGpa.toFixed(1)}`,
      why: `Сейчас ${p.gpa.toFixed(1)}. Итоговые оценки 10–11 класса попадают в транскрипт.`,
      category: 'academic',
      due: addMonths(nowIso, 3),
      estimated: false,
    });
  }
  tasks.push({
    id: 'shortlist-review',
    title: 'Сверить требования на официальных сайтах',
    why: 'Стоимость и дедлайны сверены с сайтами вузов, но условия меняются в течение цикла. Проверьте каждую программу по ссылке перед подачей.',
    category: 'academic',
    due: nowIso,
    estimated: false,
  });

  // Activities by main interest
  const activity: Record<string, [string, string]> = {
    cs: ['Сделать проект и выложить на GitHub', 'Портфолио показывает мотивацию лучше оценок.'],
    engineering: ['Участвовать в олимпиаде по физике или робототехнике', 'Инженерные программы ценят практический опыт.'],
    business: ['Запустить мини-проект или пройти кейс-чемпионат', 'Реальный опыт — сильный пункт мотивационного письма.'],
    medicine: ['Волонтёрство в медицинском учреждении', 'Показывает осознанный выбор профессии.'],
    science: ['Исследовательский проект или научная олимпиада', 'Научная работа выделяет заявку.'],
    social: ['Участвовать в MUN или дебатах', 'Развивает навыки и даёт материал для эссе.'],
    design: ['Собрать портфолио из 10–15 работ', 'Творческие программы оценивают портфолио.'],
  };
  const main = p.interests[0];
  if (main) {
    const [title, why] = activity[main];
    tasks.push({ id: `activity-${main}`, title, why, category: 'activity', due: addMonths(nowIso, 2), estimated: false });
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
