import { getSupabase } from '../supabase';

/**
 * Синхронизация маршрута с Supabase (таблица public.routes, схема в supabase/schema.sql).
 *
 * Правила, по которым выбирается версия при входе:
 *   - в облаке пусто → отправляем локальную (человек заполнял анкету до входа);
 *   - локально пусто, в облаке есть → забираем облачную;
 *   - есть обе → берём ту, что новее по updated_at. Это last-write-wins: для
 *     одного пользователя с парой устройств так честнее всего, а полноценное
 *     слияние двух наборов ответов потребовало бы спрашивать человека.
 *
 * Сохранение — с задержкой: галочки в плане щёлкают часто, и писать в базу
 * на каждый клик незачем.
 */

const TABLE = 'routes';

export type SyncStatus = 'off' | 'idle' | 'loading' | 'saving' | 'saved' | 'error';

export interface RemoteRoute<S> {
  state: S;
  updatedAt: number;
}

const listeners = new Set<(s: SyncStatus) => void>();
let status: SyncStatus = 'off';

function setStatus(next: SyncStatus) {
  status = next;
  listeners.forEach((fn) => fn(next));
}

export const getSyncStatus = () => status;

export function subscribeSync(fn: (s: SyncStatus) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Читает маршрут пользователя. null — строки ещё нет, undefined — облако недоступно. */
export async function loadRemote<S>(userId: string): Promise<RemoteRoute<S> | null | undefined> {
  const pending = getSupabase();
  if (!pending) return undefined;
  setStatus('loading');
  try {
    const client = await pending;
    const { data, error } = await client.from(TABLE).select('state, updated_at').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    setStatus('idle');
    if (!data) return null;
    return { state: data.state as S, updatedAt: new Date(data.updated_at as string).getTime() };
  } catch {
    setStatus('error');
    return undefined;
  }
}

export async function saveRemote<S>(userId: string, state: S): Promise<boolean> {
  const pending = getSupabase();
  if (!pending) return false;
  setStatus('saving');
  try {
    const client = await pending;
    const { error } = await client
      .from(TABLE)
      .upsert({ user_id: userId, state, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) throw error;
    setStatus('saved');
    return true;
  } catch {
    // Ошибку не прячем в тишину, но и не ломаем работу: локальная копия на месте,
    // а интерфейс покажет, что синхронизация не прошла.
    setStatus('error');
    return false;
  }
}

/** Ставит сохранение в очередь: частые изменения схлопываются в одну запись. */
export function debounceSave<S>(userId: string, state: S, delayMs = 1500): void {
  clearTimeout(timer);
  timer = window.setTimeout(() => void saveRemote(userId, state), delayMs);
}

let timer = 0;

export function cancelPendingSave() {
  clearTimeout(timer);
  if (status !== 'off') setStatus('off');
}
