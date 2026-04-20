import { useCallback, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme';

/* ─── localStorage encapsulation ─── */
const themeStorage = {
  get(): Theme {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    } catch {
      /* localStorage may be unavailable (SSR, private mode, quota) */
    }
    return 'system';
  },
  set(theme: Theme): void {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* silently ignore write errors */
    }
  },
};

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

function resolveTheme(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? getSystemTheme() : theme;
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(themeStorage.get);

  const isDark = resolveTheme(theme) === 'dark';

  useEffect(() => {
    applyTheme(theme);
    themeStorage.set(theme);
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

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const resolved = resolveTheme(prev);
      return resolved === 'dark' ? 'light' : 'dark';
    });
  }, []);

  const label = isDark ? 'Тёмная' : 'Светлая';

  return (
    <button
      className={`theme-switch${isDark ? ' theme-switch--dark' : ''}`}
      onClick={toggle}
      aria-label={`Тема: ${label}. Нажмите для переключения`}
      title={`Тема: ${label}`}
      type="button"
      role="switch"
      aria-checked={isDark}
    >
      {/* Sun icon */}
      <svg
        className="theme-switch__icon theme-switch__icon--sun"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>

      {/* Track with sliding thumb */}
      <span className="theme-switch__track">
        <span className="theme-switch__thumb" />
      </span>

      {/* Moon icon */}
      <svg
        className="theme-switch__icon theme-switch__icon--moon"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        <circle cx="19" cy="5" r="1" fill="currentColor" stroke="none" />
        <circle cx="17" cy="9" r="0.5" fill="currentColor" stroke="none" />
      </svg>
    </button>
  );
}
