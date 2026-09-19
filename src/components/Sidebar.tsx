import { STAGES } from '../stages';
import { go } from '../router';
import { useStore } from '../state/store';
import { ThemeToggle } from './ThemeToggle';
import { t } from '../i18n';
import { LangToggle } from './LangToggle';
import { Icon } from './ui';

/**
 * Боковая навигация — вертикальный маршрут: тот же жест, что в логотипе и в названии
 * («бағдар» — направление). Пройденные этапы заливаются, текущий подсвечен,
 * недоступные заблокированы до заполнения анкеты. На узких экранах скрыт —
 * там работает горизонтальный степпер в шапке.
 */
export function Sidebar({
  stage,
  collapsed,
  onToggle,
}: {
  stage: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { state, derived } = useStore();
  const current = STAGES.findIndex((s) => s.id === stage);
  const { done, total } = derived.progress;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <aside className="sidebar" aria-label={t('nav.sidebar')}>
      <div className="sidebar-head">
      <a className="logo sidebar-logo" href="#/">
        <span className="logo-mark" aria-hidden>
          <svg viewBox="0 0 32 32" width="28" height="28">
            <circle className="logo-pulse" cx="7" cy="25" r="4" fill="currentColor" />
            <circle className="logo-dot" cx="7" cy="25" r="4" fill="currentColor" />
            <path className="logo-path" d="M7 21V14a6 6 0 016-6h6" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path className="logo-arrow" d="M17 4l5 4-5 4" stroke="var(--accent)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="logo-word">
          {'Bagdar'.split('').map((c, i) => (
            <span key={i} style={{ '--i': i } as React.CSSProperties}>{c}</span>
          ))}
        </span>
      </a>

        <button
          type="button"
          className="sidebar-toggle"
          onClick={onToggle}
          aria-expanded={!collapsed}
          title={collapsed ? t('nav.expand') : t('nav.collapse')}
          aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
        >
          <Icon name={collapsed ? 'arrow' : 'back'} size={18} />
        </button>
      </div>

      <nav className="sidebar-nav" aria-label={t('nav.route')}>
        <ol
          className="sidebar-route"
          /* Заливка линии маршрута до текущего этапа */
          style={{ '--filled': `${(current / (STAGES.length - 1)) * 100}%` } as React.CSSProperties}
        >
          {STAGES.map((s, i) => {
            const locked = !state.profileDone && i > 1;
            const isDone = state.visited.includes(s.id) && i < current;
            const status = i === current ? 'current' : isDone ? 'done' : locked ? 'locked' : 'todo';
            return (
              <li key={s.id} className={`sidebar-stop sidebar-stop-${status}`}>
                <button
                  type="button"
                  disabled={locked}
                  aria-current={i === current ? 'step' : undefined}
                  onClick={() => go(s.id === 'start' ? '' : s.id)}
                >
                  <span className="sidebar-dot">
                    {isDone ? <Icon name="check" size={13} /> : locked ? <Icon name="lock" size={12} /> : i + 1}
                  </span>
                  <span className="sidebar-label">{t(s.label)}</span>
                  {collapsed && <span className="sidebar-tip">{t(s.label)}</span>}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="sidebar-foot">
        {state.profileDone && (
          <a className="sidebar-me" href="#/me" title={t('me.nav')}>
            <Icon name="academic" size={16} />
            <span className="sidebar-label">{t('me.nav')}</span>
          </a>
        )}
        {state.profileDone && derived.next && (
          <a className="sidebar-next" href="#/next">
            <span className="small">{t('nav.nextStep')}</span>
            <b>{derived.next.title}</b>
          </a>
        )}

        {state.profileDone && total > 0 && (
          <div className="sidebar-progress">
            <div className="sidebar-progress-head small">
              <span>{t('nav.plan')}</span>
              <span className="num">{t('nav.planOf', { done, total })}</span>
            </div>
            <div className="meter"><div className="meter-fill" style={{ width: `${pct}%`, background: 'var(--primary)' }} /></div>
          </div>
        )}

        <div className="sidebar-tools">
          <ThemeToggle />
          <LangToggle />
          <span className="small muted">{t('nav.tagline')}</span>
        </div>
      </div>
    </aside>
  );
}
