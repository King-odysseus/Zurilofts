import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { HELP_AUDIENCES, HELP_TOPICS, helpArticles } from '../data/helpArticles.js';

/**
 * The public Help Centre.
 *
 * Search and filtering happen in the browser because the whole catalogue is
 * small and shipped with the page: there is no request to wait for, and the
 * screen works from a slow connection once the bundle has loaded.
 *
 * The search term is deliberately not written into the address. A help search is
 * a moment of confusion, not a page worth sharing or keeping in history.
 */

const AUDIENCE_KEYS = {
  everyone: 'help.audienceAll',
  guest: 'help.audienceGuest',
  host: 'help.audienceHost',
};

const TOPIC_KEYS = {
  stays: 'help.topicStays',
  money: 'help.topicMoney',
  account: 'help.topicAccount',
  hosting: 'help.topicHosting',
  safety: 'help.topicSafety',
};

function matches(article, term, lang) {
  if (!term) return true;
  const needle = term.toLowerCase();
  const fields = [
    article.title[lang],
    article.summary[lang],
    ...(article.keywords[lang] || []),
  ];
  return fields.some((value) => value.toLowerCase().includes(needle));
}

function FilterRow({ label, children }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6B52]">{label}</span>
      {children}
    </div>
  );
}

function FilterButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
        active ? 'bg-[#143A80] text-white' : 'bg-[#F4F0E8] text-[#143A80] hover:bg-[#E5E7EB]'
      }`}
    >
      {children}
    </button>
  );
}

export default function HelpCentrePage() {
  const { t, lang } = useLanguage();
  const [query, setQuery] = useState('');
  const [audience, setAudience] = useState('everyone');
  const [topic, setTopic] = useState('all');

  const results = useMemo(() => {
    const term = query.trim();
    return helpArticles.filter((article) => {
      // A guest is not shown hosting articles, and the reverse, because the
      // answer would not apply to the page they are on.
      const audienceOk = audience === 'everyone' || article.audience === audience || article.audience === 'everyone';
      const topicOk = topic === 'all' || article.topic === topic;
      return audienceOk && topicOk && matches(article, term, lang);
    });
  }, [query, audience, topic, lang]);

  const searching = query.trim().length > 0;
  const contactArticle = helpArticles.find((article) => article.slug === 'contact');

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8" id="main-content">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8A6B52]">{t('help.eyebrow')}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#143A80] sm:text-4xl">{t('help.title')}</h1>
      <p className="mt-3 max-w-2xl text-[#4b5563]">{t('help.intro')}</p>

      <div className="mt-8 space-y-4">
        <label htmlFor="help-search" className="sr-only">{t('help.searchLabel')}</label>
        <div className="op-help-search">
          <Search strokeWidth={1.8} aria-hidden="true" />
          <input
            id="help-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('help.searchPlaceholder')}
          />
        </div>

        <FilterRow label={t('help.audienceLabel')}>
          {HELP_AUDIENCES.map((value) => (
            <FilterButton key={value} active={audience === value} onClick={() => setAudience(value)}>
              {t(AUDIENCE_KEYS[value])}
            </FilterButton>
          ))}
        </FilterRow>

        <FilterRow label={t('help.topicLabel')}>
          <FilterButton active={topic === 'all'} onClick={() => setTopic('all')}>{t('help.topicAll')}</FilterButton>
          {HELP_TOPICS.map((value) => (
            <FilterButton key={value} active={topic === value} onClick={() => setTopic(value)}>
              {t(TOPIC_KEYS[value])}
            </FilterButton>
          ))}
        </FilterRow>
      </div>

      <p className="mt-6 text-sm text-[#6b7280]" role="status" aria-live="polite">
        {t(results.length === 1 ? 'help.resultsOne' : 'help.resultsOther', { count: results.length })}
      </p>

      {results.length === 0 ? (
        <section className="mt-4 rounded-2xl bg-[#F4F0E8] p-6">
          <h2 className="text-lg font-semibold text-[#143A80]">{t('help.noResultsTitle')}</h2>
          <p className="mt-2 text-sm text-[#4b5563]">{t('help.noResultsBody')}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setQuery('')}
              className="rounded-full bg-[#143A80] px-4 py-2 text-sm font-semibold text-white"
            >
              {t('help.clearSearch')}
            </button>
            {contactArticle && (
              <Link to={`/help/${contactArticle.slug}`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#143A80]">
                {t('help.actionContactSupport')}
              </Link>
            )}
          </div>
        </section>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {results.map((article) => (
            <li key={article.slug}>
              <Link
                to={`/help/${article.slug}`}
                className="flex h-full flex-col gap-2 rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgb(15_23_42_/_0.06),0_4px_10px_-3px_rgb(15_23_42_/_0.10)] transition-shadow hover:shadow-[0_16px_36px_rgb(32_53_101_/_0.10)]"
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A6B52]">
                  {t(AUDIENCE_KEYS[article.audience])} - {t(TOPIC_KEYS[article.topic])}
                </span>
                <strong className="text-base font-semibold text-[#143A80]">{article.title[lang]}</strong>
                <span className="text-sm text-[#4b5563]">{article.summary[lang]}</span>
                <span className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-semibold text-[#143A80]">
                  {t('help.readArticle')}
                  <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!searching && contactArticle && (
        <section className="mt-10 rounded-2xl bg-[#0B2A5E] p-6 text-white">
          <h2 className="text-lg font-semibold">{contactArticle.title[lang]}</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/85">{contactArticle.summary[lang]}</p>
          <Link
            to={`/help/${contactArticle.slug}`}
            className="mt-4 inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#143A80]"
          >
            {t('help.actionContactSupport')}
            <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </Link>
        </section>
      )}
    </main>
  );
}

FilterRow.propTypes = {
  label: PropTypes.string.isRequired,
  children: PropTypes.node,
};

FilterButton.propTypes = {
  active: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  children: PropTypes.node,
};
