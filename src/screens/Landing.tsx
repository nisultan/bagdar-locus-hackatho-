import { useState } from 'react';
import { CountUp, Reveal, useTilt } from '../components/motion';
import { RouteLoader } from '../components/RouteLoader';
import { ScrollPath } from '../components/ScrollPath';
import { Button, CHECKED_ON, Icon } from '../components/ui';
import { SAMPLE_PROFILE } from '../data/options';
import { PROGRAMS } from '../data/programs';
import { t } from '../i18n';
import { go } from '../router';
import { useStore } from '../state/store';

const STEPS = [
  { icon: 'edit', title: 'landing.step1t', text: 'landing.step1x' },
  { icon: 'spark', title: 'landing.step2t', text: 'landing.step2x' },
  { icon: 'deadline', title: 'landing.step3t', text: 'landing.step3x' },
] as const;

const COUNTRIES = new Set(PROGRAMS.map((p) => p.country)).size;

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
