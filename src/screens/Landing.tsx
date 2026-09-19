import { useEffect, useState } from 'react';
import { getSession, subscribeSession, type Session } from '../auth';
import { CountUp, Reveal, useTilt } from '../components/motion';
import { RouteLoader } from '../components/RouteLoader';
import { ScrollPath } from '../components/ScrollPath';
import { Button, CHECKED_ON, CountryTag, Icon } from '../components/ui';
import { SAMPLE_PROFILE } from '../data/options';
import { COUNTRY_LABELS } from '../data/options';
import { PROGRAMS } from '../data/programs';
import { plural, t } from '../i18n';
import { go } from '../router';
import { useStore } from '../state/store';

const STEPS = [
  { icon: 'edit', title: 'landing.step1t', text: 'landing.step1x' },
  { icon: 'spark', title: 'landing.step2t', text: 'landing.step2x' },
  { icon: 'deadline', title: 'landing.step3t', text: 'landing.step3x' },
] as const;

const COUNTRIES = new Set(PROGRAMS.map((p) => p.country)).size;

/** Сколько программ в наборе на каждую страну — считаем из самих данных, не руками. */
const BY_COUNTRY = PROGRAMS.reduce<Record<string, number>>((acc, p) => {
  acc[p.country] = (acc[p.country] ?? 0) + 1;
  return acc;
}, {});

/** Вес каждой части оценки — те же числа, что использует движок в breakdown. */
const SCORE_PARTS = [
  { key: 'lb.scoreInterests', max: 35 },
  { key: 'lb.scoreAcademic', max: 25 },
  { key: 'lb.scoreBudget', max: 20 },
  { key: 'lb.scoreLanguage', max: 10 },
  { key: 'lb.scorePriorities', max: 10 },
] as const;

const CATALOG_POINTS = ['lb.catalog1', 'lb.catalog2', 'lb.catalog3', 'lb.catalog4'] as const;
const BAGDAR_POINTS = ['lb.bagdar1', 'lb.bagdar2', 'lb.bagdar3', 'lb.bagdar4'] as const;
const HONEST_POINTS = [
  { t: 'lb.honest1t', x: 'lb.honest1x', icon: 'warn' },
  { t: 'lb.honest2t', x: 'lb.honest2x', icon: 'info' },
  { t: 'lb.honest3t', x: 'lb.honest3x', icon: 'link' },
  { t: 'lb.honest4t', x: 'lb.honest4x', icon: 'lock' },
] as const;

export function Landing() {
  const { state, dispatch, derived } = useStore();
  const tilt = useTilt(9);
  const [starting, setStarting] = useState<null | 'profile' | 'sample'>(null);

  return (
    <div className="landing">
      {starting === 'profile' && (
        <RouteLoader steps={[{ label: t('loader.start'), ms: 850 }]} onDone={() => go('profile')} />
      )}
      {starting === 'sample' && (
        <RouteLoader
          steps={[
            { label: t('loader.sample'), ms: 550 },
            { label: t('loader.samplePick'), ms: 700 },
          ]}
          onDone={() => go('diagnosis')}
        />
      )}

      <ScrollPath />

      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow rise" style={{ '--d': '0ms' } as React.CSSProperties}>
            {t('landing.eyebrow')}
          </p>
          <h1 className="rise" style={{ '--d': '70ms' } as React.CSSProperties}>
            {t('landing.h1a')} <span className="hl">{t('landing.h1b')}</span>
          </h1>
          <p className="lead rise" style={{ '--d': '140ms' } as React.CSSProperties}>
            {t('landing.lead')}
          </p>
          <div className="hero-cta rise" style={{ '--d': '210ms' } as React.CSSProperties}>
            {state.profileDone ? (
              <>
                <Button iconRight="arrow" onClick={() => go('next')}>{t('landing.ctaContinue')}</Button>
                <Button variant="secondary" onClick={() => go('recs')}>{t('landing.ctaRecs')}</Button>
              </>
            ) : (
              <>
                <Button iconRight="arrow" onClick={() => setStarting('profile')}>{t('landing.ctaBuild')}</Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    dispatch({ type: 'saveProfile', profile: SAMPLE_PROFILE });
                    setStarting('sample');
                  }}
                >
                  {t('landing.ctaSample')}
                </Button>
              </>
            )}
          </div>

          <div className="hero-auth rise" style={{ '--d': '245ms' } as React.CSSProperties}>
            <HeroAuth />
          </div>

          <div className="hero-stats rise" style={{ '--d': '280ms' } as React.CSSProperties}>
            <span><b className="num"><CountUp value={PROGRAMS.length} /></b> {t('landing.statPrograms')}</span>
            <span><b className="num"><CountUp value={COUNTRIES} /></b> {t('landing.statCountries')}</span>
            <span><b className="num"><CountUp value={3} /></b> {t('landing.statMinutes')}</span>
          </div>

          {state.profileDone && (
            <p className="muted small rise" style={{ '--d': '340ms' } as React.CSSProperties}>
              {t('landing.progress', { done: derived.progress.done, total: derived.progress.total })}
            </p>
          )}
        </div>

        <div className="hero-preview" ref={tilt} aria-hidden>
          <div className="preview-glow" />
          <div className="preview-card">
            <div className="preview-row">
              <span className="band band-target">{t('landing.previewBand')}</span>
              <b className="preview-score num"><CountUp value={86} duration={1200} /></b>
            </div>
            <b>ELTE · Computer Science</b>
            <p className="muted small">{t('landing.previewCity')}</p>
            <div className="preview-bar"><i /></div>
            <ul className="reason-list compact">
              <li className="r-plus pop" style={{ '--d': '500ms' } as React.CSSProperties}>
                <Icon name="check" size={14} /> {t('landing.previewR1')}
              </li>
              <li className="r-plus pop" style={{ '--d': '620ms' } as React.CSSProperties}>
                <Icon name="check" size={14} /> {t('landing.previewR2')}
              </li>
              <li className="r-minus pop" style={{ '--d': '740ms' } as React.CSSProperties}>
                <Icon name="warn" size={14} /> {t('landing.previewR3')}
              </li>
            </ul>
          </div>
          <div className="preview-next">
            <Icon name="flag" size={18} />
            <div>
              <p className="small muted">{t('landing.previewNext')}</p>
              <b>{t('landing.previewTask')}</b>
            </div>
          </div>
        </div>
      </section>

      <section className="how">
        {STEPS.map((s, i) => (
          <Reveal key={s.title} as="article" className="how-card" delay={i * 110}>
            <span className="how-icon"><Icon name={s.icon} /></span>
            <p className="eyebrow">{t('landing.stepN', { n: i + 1 })}</p>
            <h3>{t(s.title)}</h3>
            <p className="muted">{t(s.text)}</p>
            <span className="how-line" aria-hidden />
          </Reveal>
        ))}
      </section>


      <Reveal as="section" className="why">
        <div className="why-head">
          <h2>{t('lb.whyTitle')}</h2>
          <p className="muted">{t('lb.whyLead')}</p>
        </div>
        <div className="why-cols">
          <div className="why-col why-col-old">
            <h3>{t('lb.catalogTitle')}</h3>
            <ul>
              {CATALOG_POINTS.map((k) => (
                <li key={k}><Icon name="close" size={15} /> {t(k)}</li>
              ))}
            </ul>
          </div>
          <div className="why-col why-col-new">
            <h3>{t('lb.bagdarTitle')}</h3>
            <ul>
              {BAGDAR_POINTS.map((k) => (
                <li key={k}><Icon name="check" size={15} /> {t(k)}</li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>

      <Reveal as="section" className="score-block" variant="left">
        <div className="score-text">
          <h2>{t('lb.scoreTitle')}</h2>
          <p className="muted">{t('lb.scoreLead')}</p>
          <p className="small score-note"><Icon name="info" size={14} /> {t('lb.scoreNote')}</p>
        </div>
        <ul className="score-bars">
          {SCORE_PARTS.map((part, i) => (
            <li key={part.key} style={{ '--d': `${i * 90}ms` } as React.CSSProperties}>
              <span className="score-bar-label">{t(part.key)}</span>
              <span className="score-bar"><i style={{ width: `${(part.max / 35) * 100}%` }} /></span>
              <b className="num">{part.max}</b>
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal as="section" className="geo" variant="right">
        <h2>{t('lb.geoTitle')}</h2>
        <p className="muted">{t('lb.geoLead')}</p>
        <ul className="geo-list">
          {Object.entries(BY_COUNTRY)
            .sort((a, b) => b[1] - a[1])
            .map(([code, n]) => (
              <li key={code} className="geo-item">
                <CountryTag code={code} />
                <b>{COUNTRY_LABELS[code as keyof typeof COUNTRY_LABELS]}</b>
                <span className="small muted">
                  {t('lb.geoPrograms', { n, word: plural(n, t('lv.progOne'), t('lv.progFew'), t('lv.progMany')) })}
                </span>
              </li>
            ))}
        </ul>
      </Reveal>

      <Reveal as="section" className="honest-block">
        <h2>{t('lb.honestTitle')}</h2>
        <div className="honest-grid">
          {HONEST_POINTS.map((h) => (
            <article key={h.t} className="honest-card">
              <span className="honest-icon"><Icon name={h.icon} size={18} /></span>
              <b>{t(h.t)}</b>
              <p className="small muted">{t(h.x)}</p>
            </article>
          ))}
        </div>
      </Reveal>

      <Reveal as="section" className="final-cta" variant="scale">
        <h2>{t('lb.ctaTitle')}</h2>
        <p className="muted">{t('lb.ctaLead')}</p>
        <div className="hero-cta">
          <Button iconRight="arrow" onClick={() => setStarting('profile')}>{t('landing.ctaBuild')}</Button>
          <Button
            variant="secondary"
            onClick={() => {
              dispatch({ type: 'saveProfile', profile: SAMPLE_PROFILE });
              setStarting('sample');
            }}
          >
            {t('landing.ctaSample')}
          </Button>
        </div>
      </Reveal>

      <Reveal as="section" className="honesty" variant="scale">
        <Icon name="info" />
        <p>
          <b>{t('landing.honestTitle')}</b>{' '}
          {t('landing.honest', { programs: PROGRAMS.length, countries: COUNTRIES, date: CHECKED_ON })}
        </p>
      </Reveal>
    </div>
  );
}

/**
 * Вход с главной. Сознательно строкой, а не кнопкой наравне с «Построить маршрут»:
 * аккаунт здесь не обязателен, и предлагать его вперёд самого продукта — значит
 * ставить барьер там, где его нет.
 */
function HeroAuth() {
  const [session, setSession] = useState<Session | null>(getSession);
  useEffect(() => {
    const off = subscribeSession(setSession);
    return () => { off(); };
  }, []);

  if (session) {
    return (
      <span className="hero-auth-in">
        <Icon name="user" size={14} />
        {t('landing.signedIn', { name: session.name })}
        <button className="link-btn" onClick={() => go('auth')}>{t('landing.account')}</button>
      </span>
    );
  }

  return (
    <>
      <button className="link-btn" onClick={() => go('auth')}>{t('landing.signIn')}</button>
      <span className="hero-auth-dot">·</span>
      <button className="link-btn" onClick={() => go('signup')}>{t('landing.signUp')}</button>
      <span className="hero-auth-dot">·</span>
      <span>{t('landing.guest')}</span>
    </>
  );
}
