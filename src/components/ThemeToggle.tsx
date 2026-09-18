import { useEffect, useState } from 'react';
import { Icon } from './ui';

type Mode = 'light' | 'dark';
const KEY = 'bagdar.theme';
const LEGACY_KEY = 'unipath.theme';

function systemMode(): Mode {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Переключатель темы. Пока пользователь не нажал кнопку, тема следует за системой —
 * выбор запоминается в localStorage и с этого момента побеждает системную настройку.
 */
export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>(() => {
    const saved = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    return saved === 'light' || saved === 'dark' ? saved : systemMode();
  });

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
  }, [mode]);

  // Если пользователь ещё не выбирал вручную — реагируем на смену системной темы.
  useEffect(() => {
    if (localStorage.getItem(KEY)) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setMode(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const next = mode === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => {
        localStorage.setItem(KEY, next);
        setMode(next);
      }}
      title={next === 'dark' ? 'Тёмная тема' : 'Светлая тема'}
      aria-label={next === 'dark' ? 'Включить тёмную тему' : 'Включить светлую тему'}
    >
      <Icon name={mode === 'dark' ? 'sun' : 'moon'} size={18} />
    </button>
  );
}
