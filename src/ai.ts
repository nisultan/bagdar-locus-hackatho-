import { FIELD_LABELS, COUNTRY_LABELS } from './data/options';
import { BAND_LABELS } from './engine/recommend';
import type { Profile, Recommendation } from './types';

export interface AdviceResult {
  text: string;
  source: 'ai' | 'rules';
}

/** Rule-based advice — always available, used as fallback when the AI endpoint is not configured. */
export function localAdvice(p: Profile, r: Recommendation): string {
  const plus = r.reasons.filter((x) => x.kind === 'plus').map((x) => x.text.replace(/\.$/, '').toLowerCase());
  const lines = [
    `${r.program.university} — ${BAND_LABELS[r.band].title.toLowerCase()} вариант для вас (совпадение ${r.score}/100).`,
    plus.length ? `Главное в пользу: ${plus.slice(0, 3).join('; ')}.` : '',
    r.gaps.length ? `Чтобы усилить заявку: ${r.gaps.slice(0, 3).join('; ').toLowerCase()}.` : 'Серьёзных пробелов по требованиям не видно — сосредоточьтесь на качестве документов.',
    `Проверьте актуальные условия на официальном сайте: ${r.program.sourceUrl}`,
  ];
  if (p.interests.length > 1) lines.splice(2, 0, `Программа покрывает направления: ${r.program.fields.map((f) => FIELD_LABELS[f]).join(', ')}.`);
  return lines.filter(Boolean).join('\n\n');
}

export async function fetchAdvice(p: Profile, r: Recommendation): Promise<AdviceResult> {
  const payload = {
    profile: {
      grade: p.grade,
      interests: p.interests.map((f) => FIELD_LABELS[f]),
      gpa: p.gpa,
      untExpected: p.untExpected,
      english: p.english,
      ielts: p.ielts,
      sat: p.sat,
      countries: p.countries.map((c) => COUNTRY_LABELS[c]),
      budgetUSD: p.budgetUSD,
      needGrant: p.needGrant,
      achievements: p.achievements,
    },
    recommendation: {
      university: r.program.university,
      program: r.program.program,
      country: COUNTRY_LABELS[r.program.country],
      score: r.score,
      band: BAND_LABELS[r.band].title,
      reasons: r.reasons.map((x) => x.text),
      gaps: r.gaps,
      entrance: r.program.entrance,
      grantNote: r.program.grantNote,
    },
  };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    const res = await fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { text?: string };
    if (!data.text) throw new Error('empty');
    return { text: data.text, source: 'ai' };
  } catch {
    return { text: localAdvice(p, r), source: 'rules' };
  }
}
