/**
 * Аккаунты без backend-сервера.
 *
 * Важное ограничение, о котором честно сказано и в интерфейсе: аккаунт живёт
 * только в этом браузере (localStorage). Это не «настоящая» авторизация — сервера,
 * который проверял бы пароль, здесь нет, и войти с другого устройства нельзя.
 * Когда появится backend, останется заменить реализацию функций ниже HTTP-запросами:
 * форма, состояние сессии и экраны менять не придётся.
 *
 * Пароль не хранится в открытом виде: держим PBKDF2-SHA256 (210 000 итераций,
 * рекомендация OWASP) со случайной солью на аккаунт. В браузере это не защищает
 * от того, кто уже получил доступ к устройству, но защищает пароль от повторного
 * использования, если кто-то заглянет в localStorage.
 */

const ACCOUNTS_KEY = 'bagdar.accounts';
const SESSION_KEY = 'bagdar.session';
const ITERATIONS = 210_000;

export type Provider = 'password' | 'google';

export interface Account {
  id: string;
  email: string;
  name: string;
  provider: Provider;
  salt?: string; // только для provider === 'password'
  hash?: string;
  createdAt: string;
}

export interface Session {
  userId: string;
  email: string;
  name: string;
  provider: Provider;
}

export type AuthError =
  | 'auth.errEmail'
  | 'auth.errPasswordShort'
  | 'auth.errPasswordWeak'
  | 'auth.errNameShort'
  | 'auth.errTaken'
  | 'auth.errNoUser'
  | 'auth.errWrongPassword'
  | 'auth.errGoogleOff'
  | 'auth.errGoogleFailed'
  | 'auth.errStorage';

export class AuthFailure extends Error {
  constructor(public code: AuthError) {
    super(code);
  }
}

// ---------- хранилище ----------

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

const listeners = new Set<(s: Session | null) => void>();

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    return s && typeof s.userId === 'string' ? s : null;
  } catch {
    return null;
  }
}

function setSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* приватный режим: сессия проживёт до перезагрузки страницы */
  }
  listeners.forEach((fn) => fn(s));
}

export function subscribeSession(fn: (s: Session | null) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function signOut() {
  setSession(null);
}

// ---------- пароли ----------

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

// ---------- регистрация и вход ----------

const normalize = (email: string) => email.trim().toLowerCase();

export async function signUp(email: string, password: string, name: string): Promise<Session> {
  const emailError = validateEmail(email);
  if (emailError) throw new AuthFailure(emailError);
  const passwordError = validatePassword(password);
  if (passwordError) throw new AuthFailure(passwordError);
  if (name.trim().length < 2) throw new AuthFailure('auth.errNameShort');

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
  return session;
}

export async function signIn(email: string, password: string): Promise<Session> {
  const account = readAccounts().find((a) => a.email === normalize(email));
  if (!account || !account.salt || !account.hash) throw new AuthFailure('auth.errNoUser');
  const hash = await derive(password, account.salt);
  if (!equalHashes(hash, account.hash)) throw new AuthFailure('auth.errWrongPassword');
  const session: Session = { userId: account.id, email: account.email, name: account.name, provider: account.provider };
  setSession(session);
  return session;
}

// ---------- Google ----------

export const GOOGLE_CLIENT_ID: string =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_GOOGLE_CLIENT_ID ?? '';
export const googleEnabled = () => GOOGLE_CLIENT_ID.length > 0;

/**
 * Разбор ID-токена только ради имени и почты для интерфейса.
 * ВАЖНО: подпись токена здесь НЕ проверяется — в браузере это и невозможно сделать
 * безопасно. Как только появится backend, токен нужно отправлять на сервер и
 * проверять там (google-auth-library / tokeninfo), иначе вход можно подделать.
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
    if ((window as any).google?.accounts?.id) return resolve();
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

/** Рисует настоящую кнопку Google в контейнере. Без client ID ничего не делает. */
export async function renderGoogleButton(container: HTMLElement, onSession: (s: Session) => void): Promise<void> {
  if (!googleEnabled()) throw new AuthFailure('auth.errGoogleOff');
  await loadGoogleScript();
  const google = (window as any).google;
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
