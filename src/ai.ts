import { FIELD_LABELS, COUNTRY_LABELS } from './data/options';
import { BAND_LABELS } from './engine/recommend';
import { getLang, t } from './i18n';
import type { Profile, Recommendation } from './types';

/**
 * Разбор рекомендации. Всегда одна и та же структура — и от модели, и от правил:
 * интерфейс рисует её блоками, поэтому длинный текст просто некуда девать.
 */
export interface Advice {
  verdict: string;
  strengths: string[];
  actions: string[];
  watch: string;
  check: string;
}

export interface AdviceResult {
  advice: Advice;
  source: 'ai' | 'rules';
}

const trim = (s: string) => s.replace(/\s+/g, ' ').replace(/\.$/, '').trim();

/** Разбор по правилам: доступен всегда, работает и без ключа, и при сбое сети. */
export function localAdvice(p: Profile, r: Recommendation): Advice {
  const plus = r.reasons.filter((x) => x.kind === 'plus').map((x) => trim(x.text));
  const minus = r.reasons.filter((x) => x.kind === 'minus').map((x) => trim(x.text));

  return {
    verdict: t('ai.localVerdict', {
      university: r.program.university,
      band: BAND_LABELS[r.band].title.toLowerCase(),
      score: r.score,
    }),
    strengths: plus.slice(0, 3),
    actions: r.gaps.length ? r.gaps.slice(0, 3) : [t('ai.localNoGaps')],
    watch: minus[0] ?? (p.needGrant && r.program.grant === 'none' ? t('ai.localNoGrant') : ''),
    check: t('ai.localCheck', { entrance: trim(r.program.entrance) }),
  };
}

export async function fetchAdvice(p: Profile, r: Recommendation): Promise<AdviceResult> {
  const payload = {
    lang: getLang(),
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
    const data = (await res.json()) as { advice?: Partial<Advice> };
    const a = data.advice;
    if (!a?.verdict) throw new Error('empty');
    return {
      source: 'ai',
      advice: {
        verdict: a.verdict,
        strengths: (a.strengths ?? []).slice(0, 3),
        actions: (a.actions ?? []).slice(0, 3),
        watch: a.watch ?? '',
        check: a.check ?? '',
      },
    };
  } catch {
    return { advice: localAdvice(p, r), source: 'rules' };
  }
}
