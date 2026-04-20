import { useCallback, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme';

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

function getStoredTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  /* Listen for OS preference changes when in "system" mode */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => {
      if (theme === 'system') applyTheme('system');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const cycle = useCallback(() => {
    setTheme((prev) => {
      const resolved = prev === 'system' ? getSystemTheme() : prev;
      return resolved === 'dark' ? 'light' : 'dark';
    });
  }, []);

  const label = theme === 'system'
    ? (getSystemTheme() === 'light' ? 'Светлая' : 'Тёмная')
    : theme === 'light' ? 'Светлая' : 'Тёмная';

  const icon = theme === 'system'
    ? (getSystemTheme() === 'light' ? '☀' : '☾')
    : theme === 'light' ? '☀' : '☾';

  return (
    <button
      className="theme-toggle"
      onClick={cycle}
      aria-label={`Тема: ${label}. Нажмите для переключения`}
      title={`Тема: ${label}`}
      type="button"
    >
      <span className="theme-toggle-icon">{icon}</span>
    </button>
  );
}
