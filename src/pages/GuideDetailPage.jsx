import { useState, useEffect } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import Spinner from '../components/Spinner.jsx';
import LoadFailed from '../components/LoadFailed.jsx';
import TranslatedHtml from '../components/TranslatedHtml.jsx';
import apiClient from '../api/client.js';
import { applyPageOverrides } from '../utils/documentHead.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useTranslated } from '../i18n/useTranslated.js';

const detailImages = [
  '/images/place-sarit-centre.jpg',
  '/images/place-karura-forest.jpg',
  '/images/eat-hero.jpg',
  '/images/place-nairobi-national-museum.jpg',
];

function GuideDetailPage() {
  const { slug: routeSlug } = useParams();
  const { pathname } = useLocation();
  const slug = routeSlug || pathname.split('/')[2];
  const { t, lang } = useLanguage();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  // Above the loading and not-found returns so the hook order never changes.
  const title = useTranslated(post?.title ?? '');

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    setFailed(false);
    apiClient
      .get(`/guides/${slug}`)
      .then((res) => setPost(res.data.data))
      .catch((error) => {
        // Only a 404 says the guide is gone. Offline, a 5xx or a timeout is a
        // failed load, and telling the reader the guide does not exist is wrong.
        if (error?.response?.status === 404) setNotFound(true);
        else setFailed(true);
      })
      .finally(() => setLoading(false));
  }, [slug, reloadToken]);

  // SEO meta: cleaned up on the way out so the next page does not inherit a
  // guide's title, excerpt and cover image.
  useEffect(() => {
    if (!post) return undefined;
    document.title = `${post.title} - ZuriLofts`;
    const summary = post.excerpt || post.title;
    return applyPageOverrides({
      description: summary,
      ogTitle: post.title,
      ogDescription: summary,
      ogImage: post.coverImage || post.image || '',
    });
  }, [post]);

  if (loading) {
    return (
      <main className="op-public-page op-guide-detail-page">
        <div className="op-content-container op-public-loader">
          <Spinner />
        </div>
      </main>
    );
  }

  if (failed) {
    return (
      <main className="op-public-page op-guide-detail-page">
        <div className="op-content-container op-public-loader">
          <div className="op-guide-not-found">
            <LoadFailed
              align="center"
              message="We could not load this guide. Check your connection and try again."
              onRetry={() => setReloadToken((token) => token + 1)}
            />
          </div>
        </div>
      </main>
    );
  }

  if (notFound || !post) {
    return (
      <main className="op-public-page op-guide-detail-page">
        <div className="op-content-container op-public-loader">
          <div className="op-guide-not-found space-y-4">
            <span>{t('discovery.guidesNotFound')}</span>
            <h1>{t('discovery.guidesMovedTitle')}</h1>
            <p>{t('discovery.guidesMovedBody')}</p>
            <Link to="/guides" className="op-primary-action">
              {t('discovery.guidesBrowse')}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="op-public-page op-guide-detail-page">
      <article className="op-content-container op-guide-detail space-y-9">
        <Link
          to="/guides"
          className="op-directory-back"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
          {t('discovery.guidesBack')}
        </Link>

        <img
          src={post.coverImage || detailImages[0]}
          alt={post.title}
          className="op-guide-detail-cover"
        />

        <header className="op-guide-detail-header space-y-4">
          <span className="op-eyebrow">{t('discovery.guidesCityGuide')}</span>
          <h1>{title}</h1>
          <p>
          {new Date(post.createdAt).toLocaleDateString(lang === 'sw' ? 'sw-KE' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </header>

        <TranslatedHtml html={post.body} className="op-guide-detail-content" />
      </article>
    </main>
  );
}

export default GuideDetailPage;
