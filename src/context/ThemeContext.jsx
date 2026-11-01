import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  THEMES,
  activeThemeAccount,
  clearLegacySharedTheme,
  readStoredTheme,
  storeTheme,
  subscribeToThemeAccount,
  themeKeyFor,
} from '../utils/themeStorage.js';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readStoredTheme);

  // The storage slot the current theme belongs to. When the signed-in person
  // changes, their own saved choice is adopted before anything is written, so
  // the previous person's theme never lands in the new account's slot.
  const ownerKeyRef = useRef(themeKeyFor(activeThemeAccount()));

  // The old single value held the last user's choice. public/theme-init.js
  // clears it before first paint; repeating it here covers a page that loaded
  // before that file was updated, and costs one key removal.
  useEffect(() => {
    clearLegacySharedTheme();
  }, []);

  useEffect(
    () => subscribeToThemeAccount(() => {
      const nextKey = themeKeyFor(activeThemeAccount());
      if (nextKey === ownerKeyRef.current) return;
      ownerKeyRef.current = nextKey;
      setTheme(readStoredTheme());
    }),
    [],
  );

  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === 'dark';

    root.classList.toggle('dark', isDark);
    root.dataset.colorMode = theme;
    root.style.colorScheme = theme;

    const themeColor = document.querySelector('meta[name="theme-color"]');
    themeColor?.setAttribute('content', isDark ? '#08101F' : '#203565');

    // Skipped on the one render that follows an account switch, where the state
    // still holds the previous person's theme for a moment.
    if (ownerKeyRef.current !== themeKeyFor(activeThemeAccount())) return;
    storeTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  const setThemeValue = useCallback((next) => {
    if (THEMES.includes(next)) setTheme(next);
  }, []);

  const value = useMemo(() => ({
    theme,
    isDark: theme === 'dark',
    toggleTheme,
    setTheme: setThemeValue,
  }), [theme, toggleTheme, setThemeValue]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}

export default ThemeContext;
