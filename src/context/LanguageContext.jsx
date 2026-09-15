import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { translations } from '../i18n/translations.js';

const LanguageContext = createContext(null);
const STORAGE_KEY = 'zuri_lang';
const SUPPORTED = Object.keys(translations); // ['en', 'sw']

function readStoredLang() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED.includes(stored) ? stored : 'en';
  } catch {
    return 'en';
  }
}

// Looks up a dot-path (e.g. "login.signIn") in the active language, falling
// back to English, then to the key itself so a missing string never crashes
// the page - it just shows the raw key, which is easy to spot while translating.
function lookup(lang, key) {
  const path = key.split('.');
  let node = translations[lang];
  for (const part of path) {
    node = node?.[part];
  }
  if (node !== undefined) return node;
  let fallback = translations.en;
  for (const part of path) {
    fallback = fallback?.[part];
  }
  return fallback ?? key;
}

// Translation coverage today is scoped to the navbar and the sign-in /
// register pages (see translations.js). Other pages still render English
// text regardless of the selected language - expand `translations.js` before
// wiring up more surfaces.
export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readStoredLang);

  const setLang = useCallback((next) => {
    if (!SUPPORTED.includes(next)) return;
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private browsing / blocked storage - the choice just won't persist across visits.
    }
  }, []);

  const t = useCallback((key) => lookup(lang, key), [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

LanguageProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export default LanguageContext;
