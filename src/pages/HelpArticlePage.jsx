import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { findArticle, relatedArticles } from '../data/helpArticles.js';

/**
 * One Help Centre article.
 *
 * The address is the only input, so an article can be linked from a message, a
 * support reply or a host's arrival guide without any other state. An unknown
 * slug is a normal outcome of an old link, so it renders a page that offers the
 * way back rather than an error.
 */
export default function HelpArticlePage() {
  // The page is chosen by App from the pathname rather than a nested <Route>,
  // so useParams has nothing here; the path is the reliable source, with the
  // param kept for the case where this is ever mounted as a real route.
  const { slug: routeSlug } = useParams();
  const { pathname } = useLocation();
  const slug = routeSlug || pathname.split('/')[2] || '';
  const { t, lang } = useLanguage();
  const article = findArticle(slug);

  if (!article) {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8" id="main-content">
        <Link to="/help" className="inline-flex items-center gap-1 text-sm font-semibold text-[#143A80]">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          {t('help.backToHelp')}
        </Link>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-[#143A80]">{t('help.notFoundTitle')}</h1>
        <p className="mt-3 text-[#4b5563]">{slug ? t('help.notFoundBody') : t('help.missingId')}</p>
        <Link
          to="/help"
          className="mt-6 inline-flex items-center gap-1 rounded-full bg-[#143A80] px-4 py-2 text-sm font-semibold text-white"
        >
          {t('help.backToHelp')}
          <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </Link>
      </main>
    );
  }

  const related = relatedArticles(article);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8" id="main-content">
      <nav aria-label={t('help.breadcrumbLabel')} className="text-sm text-[#6b7280]">
        <Link to="/help" className="font-semibold text-[#143A80]">{t('help.backToHelp')}</Link>
        <span aria-hidden="true"> / </span>
        <span>{article.title[lang]}</span>
      </nav>

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#143A80] sm:text-4xl">{article.title[lang]}</h1>
      <p className="mt-3 text-lg text-[#4b5563]">{article.summary[lang]}</p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-[#143A80]">{t('help.stepsHeading')}</h2>
        <ol className="mt-3 space-y-3">
          {article.steps[lang].map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#F4F0E8] text-xs font-bold text-[#8A6B52]">
                {index + 1}
              </span>
              <span className="text-[#1f2937]">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <Link
        to={article.action.href}
        className="mt-8 inline-flex items-center gap-1 rounded-full bg-[#143A80] px-5 py-2.5 text-sm font-semibold text-white"
      >
        {t(article.action.labelKey)}
        <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
      </Link>

      {related.length > 0 && (
        <section className="mt-10 border-t border-[#E5E7EB] pt-6">
          <h2 className="text-lg font-semibold text-[#143A80]">{t('help.relatedHeading')}</h2>
          <ul className="mt-3 space-y-2">
            {related.map((item) => (
              <li key={item.slug}>
                <Link to={`/help/${item.slug}`} className="inline-flex items-center gap-1 text-sm font-semibold text-[#143A80]">
                  {item.title[lang]}
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
