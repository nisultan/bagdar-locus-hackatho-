import { useEffect, useState } from 'react';
import { Icon } from './ui';

type Mode = 'light' | 'dark';
const KEY = 'bagdar.theme';
const LEGACY_KEY = 'unipath.theme';

function systemMode(): Mode {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function stored(): Mode | null {
  try {
    const v = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

/**
 * Тема живёт в модуле, а не в компоненте: переключатель отрисован и в шапке,
 * и в сайдбаре (на разных ширинах виден только один), и оба должны показывать
 * одно и то же состояние, а не каждый своё.
 */
let mode: Mode = stored() ?? systemMode();
let userChose = stored() != null;
const listeners = new Set<(m: Mode) => void>();

function setMode(next: Mode, byUser: boolean) {
  mode = next;
  if (byUser) {
    userChose = true;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* приватный режим — тема просто не переживёт перезагрузку */
    }
  }
  document.documentElement.dataset.theme = next;
  listeners.forEach((fn) => fn(next));
}

// Пока пользователь не выбрал вручную, следуем за системой.
if (typeof window !== 'undefined') {
  document.documentElement.dataset.theme = mode;
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!userChose) setMode(e.matches ? 'dark' : 'light', false);
  });
}

function useTheme(): [Mode, (m: Mode) => void] {
  const [local, setLocal] = useState<Mode>(mode);
  useEffect(() => {
    listeners.add(setLocal);
    setLocal(mode);
    return () => {
      listeners.delete(setLocal);
    };
  }, []);
  return [local, (m) => setMode(m, true)];
}

export function ThemeToggle() {
  const [theme, set] = useTheme();
  const next: Mode = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => set(next)}
      title={next === 'dark' ? 'Тёмная тема' : 'Светлая тема'}
      aria-label={next === 'dark' ? 'Включить тёмную тему' : 'Включить светлую тему'}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
    </button>
  );
}
