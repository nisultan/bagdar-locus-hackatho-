import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Клиент Supabase грузится лениво: сам SDK весит около 250 КБ, а нужен он только
 * на экране аккаунта и при восстановлении сессии. Поэтому первый экран маршрута
 * не платит за него — импорт случается при первом обращении к auth-функциям
 * либо в простое после загрузки страницы.
 *
 * Если переменные окружения не заданы (форк без ключей, офлайн-показ), клиента нет,
 * и `src/auth.ts` работает в браузерном режиме — сервис не должен падать из-за ключа.
 *
 * Обе переменные публичные по замыслу Supabase: anon key попадает в бандл, а доступ
 * к данным ограничивают политики RLS на стороне базы. service_role key сюда класть
 * нельзя ни при каких условиях.
 */
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

export const SUPABASE_URL = env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY ?? '';

/** Настроен ли облачный режим. Синхронно и без загрузки SDK. */
export const cloudAuth = () => SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

let clientPromise: Promise<SupabaseClient> | null = null;

export function getSupabase(): Promise<SupabaseClient> | null {
  if (!cloudAuth()) return null;
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // Ссылку из письма и ответ Google Supabase отдаёт в хеше URL.
          // У нас hash-роутер, поэтому разбираем токен сами (см. auth.ts).
          detectSessionInUrl: false,
        },
      }),
    );
  }
  return clientPromise;
}
