import { useEffect } from 'react';
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
import { useStore } from './state/store';

export const STAGES = [
  { id: 'start', label: 'Старт' },
  { id: 'profile', label: 'Профиль' },
  { id: 'diagnosis', label: 'Диагностика' },
  { id: 'recs', label: 'Рекомендации' },
  { id: 'compare', label: 'Сравнение' },
  { id: 'plan', label: 'План' },
  { id: 'next', label: 'Следующий шаг' },
];

export default function App() {
  const { state, dispatch, derived } = useStore();
  const route = useRoute();
  const known = STAGES.some((s) => s.id === route.stage);
  const needsProfile = !state.profileDone && !['start', 'profile'].includes(route.stage);
  const stage = !known ? 'start' : needsProfile ? 'profile' : route.stage;

  useEffect(() => {
    if (!known) go('');
    else if (needsProfile) go('profile');
    else dispatch({ type: 'visit', stage });
  }, [known, needsProfile, stage, dispatch]);

  const current = STAGES.findIndex((s) => s.id === stage);

  return (
    <div className="app">
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
              <span className="topbar-next-text">Шаг: {derived.next.title}</span>
            </a>
          )}
          <ThemeToggle />
        </div>
      </header>

      <nav className="stepper" aria-label="Этапы маршрута">
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
                  <span className="step-label">{s.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="stepper-mobile">
          Этап {current + 1} из {STAGES.length}: <b>{STAGES[current].label}</b>
          {current < STAGES.length - 1 && <span> → далее {STAGES[current + 1].label.toLowerCase()}</span>}
        </p>
      </nav>

      <main className="main" key={stage}>
        {stage === 'start' && <Landing />}
        {stage === 'profile' && <ProfileWizard step={Number(route.param) || 1} />}
        {stage === 'diagnosis' && <Diagnosis />}
        {stage === 'recs' && <Recommendations />}
        {stage === 'compare' && <Compare />}
        {stage === 'plan' && <RoadmapScreen />}
        {stage === 'next' && <NextStep />}
      </main>

      <footer className="footer">
        <b>Bagdar</b> — от казахского «бағдар», направление. Рекомендации строятся по прозрачным правилам, стоимость и дедлайны
        сверены с сайтами вузов ({new Date().getFullYear()}). Сервис не гарантирует поступление — всегда проверяйте условия
        на официальных сайтах.
      </footer>
    </div>
  );
}
