import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import {
  peekTranslation,
  supportsAutoTranslation,
  translateText,
} from './contentTranslation.js';

/**
 * Translates text that came from the database - a listing title, a review, a
 * guide paragraph - into the reader's language.
 *
 * Returns the original string until the translation arrives, and forever if it
 * cannot be translated. That is deliberate: the page is complete without it, so
 * there is nothing to wait for and no empty state to design.
 *
 * Pass `{ private: true }` for anything a guest wrote in a private thread, so
 * the server can refuse it unless that has been enabled on purpose.
 */
export function useTranslated(text, options = {}) {
  const { lang } = useLanguage();
  const isPrivate = options.private === true;
  const source = typeof text === 'string' ? text : '';
  const enabled = supportsAutoTranslation(lang) && source.trim().length > 1;

  const [translated, setTranslated] = useState(() =>
    enabled ? peekTranslation(source) : undefined
  );

  useEffect(() => {
    if (!enabled) return undefined;

    const cached = peekTranslation(source);
    if (cached !== undefined) {
      setTranslated(cached);
      return undefined;
    }

    let cancelled = false;
    translateText(source, { private: isPrivate }).then((result) => {
      if (!cancelled && result !== source) setTranslated(result);
    });
    return () => {
      cancelled = true;
    };
  }, [source, enabled, isPrivate]);

  return enabled ? translated ?? source : source;
}

/**
 * The same thing for a list of strings rendered in one place, such as the
 * messages in a thread. Batched separately by the order they were asked for
 * would be fragile, so results are keyed by the string itself: reordering the
 * list cannot attach the wrong translation to the wrong row.
 */
export function useTranslatedList(texts, options = {}) {
  const { lang } = useLanguage();
  const isPrivate = options.private === true;

  // Components re-render with a new array on every parent render, so the effect
  // keys off the joined contents rather than the array's identity.
  const key = useMemo(() => {
    if (!Array.isArray(texts)) return '';
    return texts.filter((text) => typeof text === 'string').join('\u0000');
  }, [texts]);

  const items = useMemo(() => (key === '' ? [] : key.split('\u0000')), [key]);
  const enabled = supportsAutoTranslation(lang);
  const [resolved, setResolved] = useState({});

  useEffect(() => {
    if (!enabled || items.length === 0) return undefined;

    let cancelled = false;
    const requests = items.map((item) => {
      const cached = peekTranslation(item);
      return cached !== undefined ? Promise.resolve(cached) : translateText(item, { private: isPrivate });
    });

    Promise.all(requests).then((values) => {
      if (cancelled) return;
      const next = {};
      items.forEach((item, i) => {
        if (values[i] && values[i] !== item) next[item] = values[i];
      });
      if (Object.keys(next).length > 0) setResolved((prev) => ({ ...prev, ...next }));
    });

    return () => {
      cancelled = true;
    };
  }, [items, enabled, isPrivate]);

  if (!enabled) return items;
  return items.map((item) => resolved[item] ?? peekTranslation(item) ?? item);
}
/**
 * The list form as a lookup, keyed by the original string. A caller rendering
 * rows from several places in one component can then ask "what does this one
 * say?" without tracking an index back to where it came from.
 */
export function useTranslatedLookup(texts, options = {}) {
  const translated = useTranslatedList(texts, options);
  const lookup = new Map();
  for (let i = 0; i < texts.length; i += 1) {
    const item = texts[i];
    if (typeof item === 'string' && translated[i] && translated[i] !== item) {
      lookup.set(item, translated[i]);
    }
  }
  return lookup;
}
