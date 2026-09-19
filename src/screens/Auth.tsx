import { useEffect, useRef, useState } from 'react';
import {
  AuthFailure, getSession, googleEnabled, passwordStrength, renderGoogleButton, signIn, signOut, signUp,
  type AuthError, type Session,
} from '../auth';
import { Button, Icon, Meter, PageHead } from '../components/ui';
import { t } from '../i18n';
import { go } from '../router';

type Mode = 'signin' | 'signup';

/** Экран входа и регистрации: две вкладки на одной форме + вход через Google. */
export function Auth({ mode: initial = 'signin' }: { mode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initial);
  const [session, setSession] = useState<Session | null>(getSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [busy, setBusy] = useState(false);
  const googleBox = useRef<HTMLDivElement>(null);
  const [googleError, setGoogleError] = useState<AuthError | null>(null);

  useEffect(() => {
    if (session || !googleBox.current) return;
    if (!googleEnabled()) {
      setGoogleError('auth.errGoogleOff');
      return;
    }
    renderGoogleButton(googleBox.current, setSession).catch((e) =>
      setGoogleError(e instanceof AuthFailure ? e.code : 'auth.errGoogleFailed'),
    );
  }, [session]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const s = mode === 'signup' ? await signUp(email, password, name) : await signIn(email, password);
      setSession(s);
      setPassword('');
    } catch (err) {
      setError(err instanceof AuthFailure ? err.code : 'auth.errStorage');
    } finally {
      setBusy(false);
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
          <p className="small muted">{t('auth.localNote')}</p>
          <div className="auth-actions">
            <Button iconRight="arrow" onClick={() => go('recs')}>{t('auth.toRoute')}</Button>
            <Button variant="ghost" icon="refresh" onClick={() => { signOut(); setSession(null); }}>{t('auth.signOut')}</Button>
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
              onClick={() => { setMode(m); setError(null); }}
            >
              {t(m === 'signin' ? 'auth.tabSignIn' : 'auth.tabSignUp')}
            </button>
          ))}
        </div>

        <form onSubmit={submit} noValidate>
          {mode === 'signup' && (
            <label className="field">
              <span className="label">{t('auth.name')}</span>
              <input
                value={name}
                autoComplete="name"
                placeholder={t('auth.namePlaceholder')}
                onChange={(e) => setName(e.target.value)}
              />
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

          <Button type="submit" full disabled={busy} iconRight="arrow">
            {busy ? t('auth.busy') : t(mode === 'signup' ? 'auth.createAccount' : 'auth.signIn')}
          </Button>
        </form>

        <div className="auth-divider"><span>{t('auth.or')}</span></div>

        <div className="auth-google">
          <div ref={googleBox} />
          {googleError && (
            <p className="small muted auth-google-note">
              <Icon name="info" size={14} /> {t(googleError)}
            </p>
          )}
        </div>

        <p className="small muted auth-foot">{t('auth.localNote')}</p>
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
