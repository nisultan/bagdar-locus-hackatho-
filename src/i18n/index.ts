import { kk } from './kk';
import { ru } from './ru';

export type Lang = 'ru' | 'kk';
export type Key = keyof typeof ru;
/** Значения — просто строки: иначе `as const` в ru.ts превратил бы их в литералы,
 *  и казахский перевод не подошёл бы по типу. */
export type Dict = Record<Key, string>;

const KEY = 'bagdar.lang';
const DICTS: Record<Lang, Dict> = { ru, kk };

export const LANG_LABELS: Record<Lang, string> = { ru: 'Рус', kk: 'Қаз' };

function stored(): Lang | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'ru' || v === 'kk' ? v : null;
  } catch {
    return null;
  }
}

/**
 * Язык живёт в модуле, а не в React-состоянии: строки нужны и в движке
 * (причины рекомендаций, задачи плана), куда хук не дотянуть.
 */
let lang: Lang = stored() ?? 'ru';
const listeners = new Set<(l: Lang) => void>();

export function getLang(): Lang {
  return lang;
}

export function setLang(next: Lang) {
  if (next === lang) return;
  lang = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* приватный режим — выбор не переживёт перезагрузку, но работать будет */
  }
  document.documentElement.lang = next;
  document.title = t('app.title');
  listeners.forEach((fn) => fn(next));
}

export function subscribeLang(fn: (l: Lang) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

if (typeof document !== 'undefined') {
  document.documentElement.lang = lang;
  document.title = t('app.title');
}

/**
 * Перевод по ключу. `vars` подставляются как {name}.
 * Если ключа нет в казахском словаре — падаем на русский, а не на пустоту:
 * лучше показать понятную строку, чем дырку в интерфейсе.
 */
export function t(key: Key, vars?: Record<string, string | number>): string {
  const raw = (DICTS[lang][key] ?? ru[key] ?? key) as string;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}

/**
 * Склонение по числу. В русском три формы, в казахском счётное слово
 * не меняется — поэтому для kk все три формы совпадают, и это не ошибка.
 */
export function plural(n: number, one: string, few: string, many: string): string {
  if (lang === 'kk') return one;
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}
