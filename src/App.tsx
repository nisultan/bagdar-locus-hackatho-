import { useEffect, useState } from 'react';
import type React from 'react';
import { ThemeToggle } from './components/ThemeToggle';
import { Icon } from './components/ui';
import { go, useRoute } from './router';
import { Compare } from './screens/Compare';
import { Diagnosis } from './screens/Diagnosis';
import { Landing } from './screens/Landing';
import { NextStep } from './screens/NextStep';
import { ProfileWizard } from './screens/ProfileWizard';
import { Recommendations } from './screens/Recommendations';
import { RoadmapScreen } from './screens/Roadmap';
import { Sidebar } from './components/Sidebar';
import { LangToggle } from './components/LangToggle';
import { t } from './i18n';
import { useLang } from './i18n/useLang';
import { STAGES } from './stages';

import { Legal } from './screens/Legal';
import { Profile } from './screens/Profile';
import { useStore } from './state/store';

const SIDEBAR_KEY = 'bagdar.sidebar';


export default function App() {
  const { state, dispatch, derived } = useStore();
  const route = useRoute();
  useLang(); // перерисовать всё дерево при смене языка
  // Правовые страницы живут вне маршрута: они не этап и не требуют анкеты.
  const legal = route.stage === 'privacy' || route.stage === 'terms' ? route.stage : null;
  const aside = route.stage === 'me' ? 'me' : null;
  const known = STAGES.some((s) => s.id === route.stage);
  const needsProfile = !state.profileDone && !['start', 'profile'].includes(route.stage);
  const stage = !known ? 'start' : needsProfile ? 'profile' : route.stage;

  useEffect(() => {
    if (legal || aside) return;
    if (!known) go('');
    else if (needsProfile) go('profile');
    else dispatch({ type: 'visit', stage });
  }, [legal, aside, known, needsProfile, stage, dispatch]);

  const current = STAGES.findIndex((s) => s.id === stage);

  // Свёрнутость сайдбара запоминаем: это осознанный выбор, а не настройка на один визит.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(SIDEBAR_KEY, c ? '0' : '1');
      } catch {
        /* приватный режим — выбор просто не переживёт перезагрузку */
      }
      return !c;
    });
  };

  return (
    <div className={`app${collapsed ? ' app-collapsed' : ''}`}>
      <Sidebar stage={stage} collapsed={collapsed} onToggle={toggleSidebar} />

      <div className="app-body">
      <header className="topbar">
        <a className="logo" href="#/">
          <span className="logo-mark" aria-hidden>
            <svg viewBox="0 0 32 32" width="28" height="28">
              {/* точка старта — пульсирует, как «вы здесь» на карте */}
              <circle className="logo-pulse" cx="7" cy="25" r="4" fill="currentColor" />
              <circle className="logo-dot" cx="7" cy="25" r="4" fill="currentColor" />
              {/* сам маршрут — рисуется штрихом при загрузке и при наведении */}
              <path className="logo-path" d="M7 21V14a6 6 0 016-6h6" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
              {/* стрелка-цель — доезжает до конца пути */}
              <path className="logo-arrow" d="M17 4l5 4-5 4" stroke="var(--accent)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="logo-word">
            {'Bagdar'.split('').map((c, i) => (
              <span key={i} style={{ '--i': i } as React.CSSProperties}>{c}</span>
            ))}
          </span>
        </a>
        <div className="topbar-tools">
          {state.profileDone && derived.next && stage !== 'next' && (
            <a className="topbar-next" href="#/next">
              <Icon name="flag" size={16} />
              <span className="topbar-next-text">{t('app.stepChip', { title: derived.next.title })}</span>
            </a>
          )}
          <LangToggle />
          <ThemeToggle />
        </div>
      </header>

      {!legal && !aside && (
      <nav className="stepper" aria-label={t('nav.route')}>
        <ol>
          {STAGES.map((s, i) => {
            const locked = !state.profileDone && i > 1;
            const done = state.visited.includes(s.id) && i < current;
            const status = i === current ? 'current' : done ? 'done' : locked ? 'locked' : 'todo';
            return (
              <li key={s.id} className={`step step-${status}`}>
                <button
                  type="button"
                  disabled={locked}
                  aria-current={i === current ? 'step' : undefined}
                  onClick={() => go(s.id === 'start' ? '' : s.id)}
                >
                  <span className="step-dot">{done ? <Icon name="check" size={14} /> : i + 1}</span>
                  <span className="step-label">{t(s.label)}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="stepper-mobile">
          {t('app.stageOf', { n: current + 1, total: STAGES.length })} <b>{t(STAGES[current].label)}</b>
          {current < STAGES.length - 1 && <span> {t('app.thenNext', { next: t(STAGES[current + 1].label).toLowerCase() })}</span>}
        </p>
      </nav>
      )}

      <main className="main" key={legal ?? aside ?? stage}>
        {legal && <Legal kind={legal} />}
        {aside === 'me' && <Profile />}
        {!legal && !aside && stage === 'start' && <Landing />}
        {!legal && !aside && stage === 'profile' && <ProfileWizard step={Number(route.param) || 1} />}
        {!legal && !aside && stage === 'diagnosis' && <Diagnosis />}
        {!legal && !aside && stage === 'recs' && <Recommendations />}
        {!legal && !aside && stage === 'compare' && <Compare />}
        {!legal && !aside && stage === 'plan' && <RoadmapScreen />}
        {!legal && !aside && stage === 'next' && <NextStep />}
      </main>

      <footer className="footer">
        <p><b>{t('app.footerName')}</b> {t('app.footer', { year: new Date().getFullYear() })}</p>
        <p className="footer-links">
          <a href="#/privacy">{t('app.privacy')}</a>
          <a href="#/terms">{t('app.terms')}</a>
        </p>
      </footer>
      </div>
    </div>
  );
}
