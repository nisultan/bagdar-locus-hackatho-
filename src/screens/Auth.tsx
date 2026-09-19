import { useEffect, useRef, useState } from 'react';
import {
  AuthFailure, authMode, getSession, googleEnabled, passwordStrength, renderGoogleButton, resetPassword,
  getRedirectError, signIn, signInWithGoogle, signOut, signUp, subscribeRedirectError, subscribeSession,
  type AuthError, type Session,
} from '../auth';
import { Button, GoogleMark, Icon, Meter, PageHead } from '../components/ui';
import { getSyncStatus, subscribeSync, type SyncStatus } from '../state/sync';
import { t } from '../i18n';
import { go } from '../router';

type Mode = 'signin' | 'signup';
type Notice = 'auth.confirmSent' | 'auth.resetSent';

/** Экран входа и регистрации: две вкладки на одной форме + вход через Google. */
export function Auth({ mode: initial = 'signin' }: { mode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initial);
  const [session, setSession] = useState<Session | null>(getSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const googleBox = useRef<HTMLDivElement>(null);
  const [googleError, setGoogleError] = useState<AuthError | null>(null);
  // Причина неудачного возврата от Google или из письма — иначе человек
  // видит просто перезагруженную страницу и не понимает, что пошло не так.
  const [redirectError, setRedirectError] = useState<string | null>(getRedirectError);
  const cloud = authMode() === 'cloud';

  // Вход через Google и подтверждение почты возвращают пользователя на эту страницу,
  // поэтому сессия может появиться уже после первого рендера.
  useEffect(() => subscribeSession(setSession) as unknown as () => void, []);
  useEffect(() => subscribeRedirectError(setRedirectError) as unknown as () => void, []);

  // Кнопку Google Identity Services рисуем только в локальном режиме:
  // в облачном Supabase сам уводит на экран Google.
  useEffect(() => {
    if (session || cloud || !googleBox.current) return;
    if (!googleEnabled()) {
      setGoogleError('auth.errGoogleOff');
      return;
    }
    renderGoogleButton(googleBox.current, setSession).catch((e) =>
      setGoogleError(e instanceof AuthFailure ? e.code : 'auth.errGoogleFailed'),
    );
  }, [session, cloud]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === 'signup') {
        const result = await signUp(email, password, name);
        if (result.needsConfirmation) setNotice('auth.confirmSent');
        else setSession(result.session);
      } else {
        setSession(await signIn(email, password));
      }
      setPassword('');
    } catch (err) {
      setError(err instanceof AuthFailure ? err.code : 'auth.errNetwork');
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    setError(null);
    setNotice(null);
    try {
      await resetPassword(email);
      setNotice('auth.resetSent');
    } catch (err) {
      setError(err instanceof AuthFailure ? err.code : 'auth.errNetwork');
    }
  };

  const google = async () => {
    setGoogleError(null);
    try {
      await signInWithGoogle(); // уводит на экран Google, дальше redirect обратно
    } catch (err) {
      setGoogleError(err instanceof AuthFailure ? err.code : 'auth.errGoogleFailed');
    }
  };

  if (session) {
    return (
      <div className="stack auth-wrap">
        <PageHead eyebrow={t('auth.eyebrow')} title={t('auth.signedInTitle', { name: session.name })} />
        <section className="card auth-card">
          <p className="auth-account">
            <span className="auth-avatar" aria-hidden>{session.name.slice(0, 1).toUpperCase()}</span>
            <span>
              <b>{session.name}</b>
              <span className="small muted"> {session.email}</span>
              <span className="small muted"> · {t(session.provider === 'google' ? 'auth.viaGoogle' : 'auth.viaPassword')}</span>
            </span>
          </p>
          <p className="small muted">{t(cloud ? 'auth.cloudNote' : 'auth.localNote')}</p>
          {cloud && <SyncBadge />}
          <div className="auth-actions">
            <Button iconRight="arrow" onClick={() => go('recs')}>{t('auth.toRoute')}</Button>
            <Button variant="ghost" icon="refresh" onClick={async () => { await signOut(); setSession(null); }}>
              {t('auth.signOut')}
            </Button>
          </div>
        </section>
      </div>
    );
  }

  const strength = passwordStrength(password);

  return (
    <div className="stack auth-wrap">
      <PageHead eyebrow={t('auth.eyebrow')} title={t(mode === 'signup' ? 'auth.signUpTitle' : 'auth.signInTitle')}>
        {t('auth.lead')}
      </PageHead>

      <section className="card auth-card">
        <div className="auth-tabs" role="tablist">
          {(['signin', 'signup'] as Mode[]).map((m) => (
            <button
              key={m}
              role="tab"
              type="button"
              aria-selected={mode === m}
              className={`auth-tab${mode === m ? ' on' : ''}`}
              onClick={() => { setMode(m); setError(null); setNotice(null); }}
            >
              {t(m === 'signin' ? 'auth.tabSignIn' : 'auth.tabSignUp')}
            </button>
          ))}
        </div>

        <form onSubmit={submit} noValidate>
          {mode === 'signup' && (
            <label className="field">
              <span className="label">{t('auth.name')}</span>
              <input value={name} autoComplete="name" placeholder={t('auth.namePlaceholder')} onChange={(e) => setName(e.target.value)} />
            </label>
          )}

          <label className="field">
            <span className="label">{t('auth.email')}</span>
            <input
              type="email"
              value={email}
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="label">{t('auth.password')}</span>
            <span className="auth-password">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                placeholder={t('auth.passwordPlaceholder')}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" className="link-btn" onClick={() => setShowPassword((v) => !v)}>
                {t(showPassword ? 'auth.hide' : 'auth.show')}
              </button>
            </span>
            {mode === 'signup' && password.length > 0 && (
              <>
                <Meter value={strength} max={3} tone={strength >= 3 ? 'good' : strength >= 2 ? 'primary' : 'warn'} />
                <span className="small muted">{t(`auth.strength${strength}` as 'auth.strength0')}</span>
              </>
            )}
          </label>

          {error && <p className="error" role="alert"><Icon name="warn" size={16} /> {t(error)}</p>}
          {notice && <p className="auth-notice" role="status"><Icon name="check" size={16} /> {t(notice)}</p>}

          <Button type="submit" full disabled={busy} iconRight="arrow">
            {busy ? t('auth.busy') : t(mode === 'signup' ? 'auth.createAccount' : 'auth.signIn')}
          </Button>

          {cloud && mode === 'signin' && (
            <p className="auth-forgot">
              <button type="button" className="link-btn" onClick={forgot}>{t('auth.forgot')}</button>
            </p>
          )}
        </form>

        {redirectError && (
          <p className="error" role="alert">
            <Icon name="warn" size={16} /> {t('auth.redirectFailed', { reason: redirectError })}
          </p>
        )}

        <div className="auth-divider"><span>{t('auth.or')}</span></div>

        <div className="auth-google">
          {cloud ? (
            <button type="button" className="btn-google" onClick={google}>
              <GoogleMark /> {t('auth.googleCta')}
            </button>
          ) : (
            <div ref={googleBox} />
          )}
          {googleError && (
            <p className="small muted auth-google-note"><Icon name="info" size={14} /> {t(googleError)}</p>
          )}
        </div>

        <p className="small muted auth-foot">{t(cloud ? 'auth.cloudNote' : 'auth.localNote')}</p>
        <p className="small muted">
          {t('auth.legalNote')} <a href="#/privacy">{t('app.privacy')}</a> · <a href="#/terms">{t('app.terms')}</a>
        </p>
      </section>

      <p className="small muted auth-skip">
        {t('auth.skipNote')} <button className="link-btn" onClick={() => go('profile')}>{t('auth.skip')}</button>
      </p>
    </div>
  );
}

/** Состояние синхронизации маршрута с облаком — чтобы не гадать, сохранилось ли. */
function SyncBadge() {
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus);
  useEffect(() => {
    const off = subscribeSync(setStatus);
    return () => { off(); };
  }, []);
  if (status === 'off') return null;
  const tone = status === 'error' ? 'bad' : status === 'saved' ? 'ok' : 'muted';
  const icon = status === 'error' ? 'warn' : status === 'saved' ? 'check' : 'refresh';
  return (
    <p className={`small sync-badge ${tone}`}>
      <Icon name={icon} size={14} /> {t(`sync.${status}` as 'sync.idle')}
    </p>
  );
}
