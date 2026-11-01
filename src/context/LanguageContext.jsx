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
  // A key can arrive as undefined when it is built from data, so guard before
  // splitting. Returning an empty string keeps the surrounding layout intact.
  if (typeof key !== 'string' || key === '') return '';
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

// Every string a page shows comes from src/i18n/translations.js, which merges
// one dictionary per area of the product (src/i18n/domains/*). Adding strings
// to a dictionary does nothing until the page calls `t`: the markup still
// carries its English literal until it is replaced with a lookup.
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

  // A sentence with a value in it stays one translated string: the count or
  // name is a {placeholder} inside the dictionary entry, not a fragment glued
  // on by the page. Otherwise word order would be fixed by the English
  // sentence and Swahili could not phrase it correctly.
  const t = useCallback((key, params) => {
    const value = lookup(lang, key);
    if (!params || typeof value !== 'string') return value;
    return value.replace(/\{(\w+)\}/g, (match, name) => (
      params[name] === undefined ? match : String(params[name])
    ));
  }, [lang]);

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
