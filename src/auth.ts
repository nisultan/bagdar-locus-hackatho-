/**
 * Аккаунты: два режима с одним и тем же интерфейсом для экранов.
 *
 *   «cloud» — заданы VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY: регистрация, вход,
 *     подтверждение почты и вход через Google идут через Supabase Auth. Пароль
 *     проверяет сервер, сессия переживает смену устройства, ID-токен Google
 *     проверяется на стороне Supabase — а не в браузере.
 *
 *   «local» — переменных нет (форк без ключей, офлайн-показ): аккаунт живёт в
 *     localStorage этого браузера. Пароль хранится как PBKDF2-SHA256 (210 000
 *     итераций, случайная соль). Это не замена серверу, а запасной путь, чтобы
 *     демо не падало без ключей; интерфейс об этом честно предупреждает.
 *
 * Экраны знают только про функции ниже, поэтому режим можно переключать
 * переменными окружения, не трогая UI.
 */
import { cloudAuth, getSupabase } from './supabase';

/**
 * Куда Supabase вернёт человека после Google или письма.
 *
 * Без фрагмента намеренно: в implicit-режиме Supabase всё равно заменяет его
 * своими токенами, а список Redirect URLs в панели сверяется по адресу без
 * хеша — лишний «#/auth» только мешал совпадению. На нужный экран мы уходим
 * сами, уже разобрав ответ (см. cleanUrl).
 */
const redirectTarget = () =>
  typeof window === 'undefined' ? '' : `${window.location.origin}${window.location.pathname}`;

const ACCOUNTS_KEY = 'bagdar.accounts';
const SESSION_KEY = 'bagdar.session';
const ITERATIONS = 210_000;

export type Provider = 'password' | 'google';
export type AuthMode = 'cloud' | 'local';

export const authMode = (): AuthMode => (cloudAuth() ? 'cloud' : 'local');

export interface Account {
  id: string;
  email: string;
  name: string;
  provider: Provider;
  salt?: string; // только для локального режима
  hash?: string;
  createdAt: string;
}

export interface Session {
  userId: string;
  email: string;
  name: string;
  provider: Provider;
}

/** Регистрация в облаке может потребовать подтверждения почты — тогда сессии ещё нет. */
export interface SignUpResult {
  session: Session | null;
  needsConfirmation: boolean;
}

export type AuthError =
  | 'auth.errEmail'
  | 'auth.errPasswordShort'
  | 'auth.errPasswordWeak'
  | 'auth.errNameShort'
  | 'auth.errTaken'
  | 'auth.errNoUser'
  | 'auth.errWrongPassword'
  | 'auth.errNotConfirmed'
  | 'auth.errRateLimit'
  | 'auth.errNetwork'
  | 'auth.errGoogleOff'
  | 'auth.errGoogleFailed'
  | 'auth.errStorage';

export class AuthFailure extends Error {
  constructor(public code: AuthError) {
    super(code);
  }
}

// ---------- сессия ----------

const listeners = new Set<(s: Session | null) => void>();
let current: Session | null = readStoredSession();

function readStoredSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    return s && typeof s.userId === 'string' ? s : null;
  } catch {
    return null;
  }
}

/** Сессию кешируем в localStorage, чтобы шапка не мигала «Войти» при загрузке. */
function setSession(s: Session | null) {
  current = s;
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* приватный режим: сессия проживёт до перезагрузки страницы */
  }
  listeners.forEach((fn) => fn(s));
}

export function getSession(): Session | null {
  return current;
}

export function subscribeSession(fn: (s: Session | null) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ---------- Supabase ----------

interface SupaUser {
  id: string;
  email?: string;
  app_metadata?: { provider?: string };
  user_metadata?: { full_name?: string; name?: string };
}

function toSession(user: SupaUser): Session {
  const meta = user.user_metadata ?? {};
  const email = user.email ?? '';
  return {
    userId: user.id,
    email,
    name: meta.full_name || meta.name || email.split('@')[0] || 'Профиль',
    provider: user.app_metadata?.provider === 'google' ? 'google' : 'password',
  };
}

/**
 * Возврат после входа через Google или по ссылке из письма.
 *
 * supabase-js в этой версии работает в implicit-режиме: токены прилетают во
 * ФРАГМЕНТЕ адреса (`#access_token=...`), а фрагмент у нас занят hash-роутером.
 * Роутер просыпается первым, не узнаёт такой «маршрут» и делает go('') — вместе
 * с хешем он стирал токены раньше, чем их кто-либо прочитал. Со стороны это
 * выглядело так, будто сайт просто перезагрузился и вход не сработал.
 *
 * Поэтому ответ снимаем с адреса СИНХРОННО при импорте модуля: импорты
 * выполняются до первого рендера и до эффектов роутера.
 */
const AUTH_PARAMS = ['code', 'access_token', 'refresh_token', 'error', 'error_code', 'error_description'] as const;

type RedirectPayload = Partial<Record<(typeof AUTH_PARAMS)[number], string>>;

function captureAuthRedirect(): RedirectPayload | null {
  if (typeof window === 'undefined') return null;

  const query = new URLSearchParams(window.location.search);

  // Supabase заменяет фрагмент целиком, поэтому «#/auth» превращается в
  // «#access_token=...». Если фрагмент начинается со слэша — это наш маршрут.
  const hash = window.location.hash;
  const raw = hash.slice(hash.lastIndexOf('#') + 1);
  const fragment = new URLSearchParams(raw.startsWith('/') ? '' : raw);

  const found: RedirectPayload = {};
  for (const key of AUTH_PARAMS) {
    const value = query.get(key) ?? fragment.get(key);
    if (value) found[key] = value;
  }

  if (Object.keys(found).length === 0) return null;
  cleanUrl();
  return found;
}

/** Убираем токен или код из адреса и истории — там им не место. */
function cleanUrl() {
  window.history.replaceState(null, '', window.location.pathname + '#/auth');
}

const redirectPayload = captureAuthRedirect();

// ---------- ошибка возврата ----------

let redirectError: string | null = null;
const errorListeners = new Set<(e: string | null) => void>();

export function getRedirectError(): string | null {
  return redirectError;
}

export function subscribeRedirectError(fn: (e: string | null) => void) {
  errorListeners.add(fn);
  return () => {
    errorListeners.delete(fn);
  };
}

function setRedirectError(message: string | null) {
  redirectError = message;
  errorListeners.forEach((fn) => fn(message));
}

// Если провайдер вернул ошибку, показать её можно сразу: ни SDK, ни сеть не нужны.
if (redirectPayload?.error) {
  redirectError = redirectPayload.error_description || redirectPayload.error;
}

/**
 * Пускаем в дело то, что сняли с адреса. Любая неудача становится видимой:
 * раньше ошибка обмена кода молча игнорировалась, и человек возвращался
 * на страницу без объяснения, почему он не вошёл.
 */
async function consumeOAuthRedirect(client: SupabaseLike) {
  if (!redirectPayload) return;

  if (redirectPayload.error) {
    setRedirectError(redirectPayload.error_description || redirectPayload.error);
    return;
  }

  if (redirectPayload.code) {
    const { error } = await client.auth.exchangeCodeForSession(redirectPayload.code);
    if (error) setRedirectError(error.message);
    return;
  }

  const access_token = redirectPayload.access_token;
  const refresh_token = redirectPayload.refresh_token;
  if (access_token && refresh_token) {
    const { error } = await client.auth.setSession({ access_token, refresh_token });
    if (error) setRedirectError(error.message);
  }
}

type SupabaseLike = Awaited<NonNullable<ReturnType<typeof getSupabase>>>;

let bootstrapped: Promise<SupabaseLike | null> | null = null;

/**
 * Подключаем Supabase при первом обращении: подхватываем токены из редиректа,
 * сверяем сохранённую сессию с сервером и подписываемся на её изменения.
 */
function bootstrapCloud(): Promise<SupabaseLike | null> {
  const pending = getSupabase();
  if (!pending) return Promise.resolve(null);
  if (!bootstrapped) {
    bootstrapped = pending.then(async (client) => {
      await consumeOAuthRedirect(client);
      client.auth.onAuthStateChange((_event, session) => {
        setSession(session ? toSession(session.user as SupaUser) : null);
      });
      const { data } = await client.auth.getSession();
      setSession(data.session ? toSession(data.session.user as SupaUser) : null);
      return client;
    });
  }
  return bootstrapped;
}

// Сессию сверяем с сервером в простое после загрузки: до этого шапка показывает
// закешированный аккаунт, поэтому подключение SDK ничего не задерживает.
if (cloudAuth() && typeof window !== 'undefined') {
  if (redirectPayload) {
    // Человек только что вернулся от Google или из письма — ждать простоя нельзя.
    void bootstrapCloud();
  } else {
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    if (idle) idle(() => void bootstrapCloud());
    else window.setTimeout(() => void bootstrapCloud(), 1200);
  }
}

/** Тексты ошибок Supabase — в наши коды, чтобы интерфейс говорил по-человечески. */
function mapSupabaseError(message: string): AuthError {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'auth.errWrongPassword';
  if (m.includes('email not confirmed')) return 'auth.errNotConfirmed';
  if (m.includes('already registered') || m.includes('already been registered')) return 'auth.errTaken';
  if (m.includes('rate limit') || m.includes('too many')) return 'auth.errRateLimit';
  if (m.includes('password')) return 'auth.errPasswordShort';
  if (m.includes('failed to fetch') || m.includes('network')) return 'auth.errNetwork';
  return 'auth.errNetwork';
}

// ---------- пароли (локальный режим) ----------

const enc = new TextEncoder();
const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

async function derive(password: string, saltHex: string): Promise<string> {
  const salt = Uint8Array.from(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, key, 256);
  return toHex(bits);
}

/** Сравнение за постоянное время: длина одинаковая, выходим только в конце. */
function equalHashes(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function readAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Account[]) : [];
  } catch {
    return [];
  }
}

function writeAccounts(list: Account[]) {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
  } catch {
    throw new AuthFailure('auth.errStorage');
  }
}

// ---------- валидация ----------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email: string): AuthError | null {
  return EMAIL_RE.test(email.trim()) ? null : 'auth.errEmail';
}

export function validatePassword(password: string): AuthError | null {
  if (password.length < 8) return 'auth.errPasswordShort';
  // Не требуем спецсимволов — длина важнее; но чисто цифровой пароль отсекаем.
  if (/^\d+$/.test(password)) return 'auth.errPasswordWeak';
  return null;
}

/** Грубая оценка для индикатора силы: 0–3. */
export function passwordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-zA-Zа-яА-Я]/.test(password) && /\d/.test(password)) score++;
  if (/[^\w\s]/.test(password) && password.length >= 10) score++;
  return Math.min(score, 3);
}

const normalize = (email: string) => email.trim().toLowerCase();

// ---------- регистрация и вход ----------

export async function signUp(email: string, password: string, name: string): Promise<SignUpResult> {
  const emailError = validateEmail(email);
  if (emailError) throw new AuthFailure(emailError);
  const passwordError = validatePassword(password);
  if (passwordError) throw new AuthFailure(passwordError);
  if (name.trim().length < 2) throw new AuthFailure('auth.errNameShort');

  const client = await bootstrapCloud();
  if (client) {
    const { data, error } = await client.auth.signUp({
      email: normalize(email),
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: redirectTarget(),
      },
    });
    if (error) throw new AuthFailure(mapSupabaseError(error.message));
    if (!data.session) return { session: null, needsConfirmation: true };
    const session = toSession(data.session.user as SupaUser);
    setSession(session);
    return { session, needsConfirmation: false };
  }

  const accounts = readAccounts();
  if (accounts.some((a) => a.email === normalize(email))) throw new AuthFailure('auth.errTaken');
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const account: Account = {
    id: crypto.randomUUID(),
    email: normalize(email),
    name: name.trim(),
    provider: 'password',
    salt,
    hash: await derive(password, salt),
    createdAt: new Date().toISOString(),
  };
  writeAccounts([...accounts, account]);
  const session: Session = { userId: account.id, email: account.email, name: account.name, provider: 'password' };
  setSession(session);
  return { session, needsConfirmation: false };
}

export async function signIn(email: string, password: string): Promise<Session> {
  const client = await bootstrapCloud();
  if (client) {
    const { data, error } = await client.auth.signInWithPassword({ email: normalize(email), password });
    if (error) throw new AuthFailure(mapSupabaseError(error.message));
    const session = toSession(data.user as SupaUser);
    setSession(session);
    return session;
  }

  const account = readAccounts().find((a) => a.email === normalize(email));
  if (!account || !account.salt || !account.hash) throw new AuthFailure('auth.errNoUser');
  const hash = await derive(password, account.salt);
  if (!equalHashes(hash, account.hash)) throw new AuthFailure('auth.errWrongPassword');
  const session: Session = { userId: account.id, email: account.email, name: account.name, provider: account.provider };
  setSession(session);
  return session;
}

export async function signOut() {
  const client = await bootstrapCloud();
  if (client) await client.auth.signOut();
  setSession(null);
}

/** Письмо со ссылкой на сброс пароля. Доступно только в облачном режиме. */
export async function resetPassword(email: string): Promise<void> {
  const client = await bootstrapCloud();
  if (!client) throw new AuthFailure('auth.errNoUser');
  const emailError = validateEmail(email);
  if (emailError) throw new AuthFailure(emailError);
  const { error } = await client.auth.resetPasswordForEmail(normalize(email), {
    redirectTo: redirectTarget(),
  });
  if (error) throw new AuthFailure(mapSupabaseError(error.message));
}

// ---------- Google ----------

export const GOOGLE_CLIENT_ID: string =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_GOOGLE_CLIENT_ID ?? '';

/**
 * Через Supabase Google работает без отдельного client ID в коде: ID и secret
 * вписываются в панели Supabase, а токен проверяется на их сервере.
 */
export const googleEnabled = () => cloudAuth() || GOOGLE_CLIENT_ID.length > 0;

export async function signInWithGoogle(): Promise<void> {
  const client = await bootstrapCloud();
  if (!client) throw new AuthFailure('auth.errGoogleOff');
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectTarget() },
  });
  if (error) throw new AuthFailure('auth.errGoogleFailed');
}

/**
 * Запасной путь для режима без Supabase: кнопка Google Identity Services.
 * ВАЖНО: подпись ID-токена здесь не проверяется — в браузере это невозможно сделать
 * безопасно, поэтому такой вход годится только для демонстрации интерфейса.
 * Настоящая проверка живёт в облачном режиме, на стороне Supabase.
 */
function decodeIdToken(jwt: string): { email?: string; name?: string; sub?: string } {
  const payload = jwt.split('.')[1];
  if (!payload) throw new AuthFailure('auth.errGoogleFailed');
  const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(decodeURIComponent(escape(json)));
}

let scriptPromise: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if ((window as unknown as { google?: unknown }).google) return resolve();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new AuthFailure('auth.errGoogleFailed'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export async function renderGoogleButton(container: HTMLElement, onSession: (s: Session) => void): Promise<void> {
  if (!GOOGLE_CLIENT_ID) throw new AuthFailure('auth.errGoogleOff');
  await loadGoogleScript();
  const google = (window as unknown as { google: any }).google;
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (response: { credential: string }) => {
      const claims = decodeIdToken(response.credential);
      if (!claims.email || !claims.sub) throw new AuthFailure('auth.errGoogleFailed');
      const accounts = readAccounts();
      let account = accounts.find((a) => a.email === claims.email);
      if (!account) {
        account = {
          id: claims.sub,
          email: claims.email,
          name: claims.name ?? claims.email.split('@')[0],
          provider: 'google',
          createdAt: new Date().toISOString(),
        };
        writeAccounts([...accounts, account]);
      }
      const session: Session = { userId: account.id, email: account.email, name: account.name, provider: 'google' };
      setSession(session);
      onSession(session);
    },
  });
  google.accounts.id.renderButton(container, { theme: 'outline', size: 'large', width: 320, text: 'continue_with', shape: 'pill' });
}
