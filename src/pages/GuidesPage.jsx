import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight } from 'lucide-react';
import Spinner from '../components/Spinner.jsx';
import apiClient from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useTranslatedList } from '../i18n/useTranslated.js';

const guideImages = [
  '/images/place-sarit-centre.jpg',
  '/images/place-un-hq.jpg',
  '/images/place-karura-forest.jpg',
  '/images/eat-hero.jpg',
  '/images/place-nairobi-national-museum.jpg',
  '/images/eat-artcaffe.jpg',
];

function GuidesPage() {
  const { t, lang } = useLanguage();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get('/guides')
      .then((res) => setPosts(res.data.data || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  // Post titles and standfirsts are written in the database, so they are read in
  // the reader's language too. Both hooks sit above the list's .map, in the order
  // the rows render, so a translation always lands on the post it came from.
  const titles = useTranslatedList(posts.map((post) => post.title ?? ''));
  const excerpts = useTranslatedList(posts.map((post) => post.excerpt ?? ''));

  if (loading) {
    return (
      <main className="op-guides-page">
        <div className="flex min-h-[60vh] items-center justify-center pt-16">
          <Spinner />
        </div>
      </main>
    );
  }

  return (
    <main className="op-guides-page">
      <header className="op-guides-hero">
        <div className="op-content-container space-y-4">
          <nav className="op-breadcrumbs" aria-label={t('discovery.guidesBreadcrumb')}>
            <Link to="/">{t('discovery.navHome')}</Link>
            <span>/</span>
            <span>{t('discovery.guidesNav')}</span>
          </nav>
          <span className="op-eyebrow">{t('discovery.guidesEyebrow')}</span>
          <h1>{t('discovery.guidesTitle')}</h1>
          <p>{t('discovery.guidesIntro')}</p>
        </div>
      </header>

      <section className="op-guides-content">
        <div className="op-content-container">
          {posts.length === 0 ? (
            <div className="op-guides-empty space-y-5">
              <div className="op-guides-empty-icon">
                <BookOpen strokeWidth={2} aria-hidden="true" />
              </div>
              <h2>{t('discovery.guidesEmptyTitle')}</h2>
              <p>{t('discovery.guidesEmptyBody')}</p>
            </div>
          ) : (
            <div className="op-guide-grid">
              {posts.map((post, index) => (
                <Link
                  key={post.id}
                  to={`/guides/${post.slug}`}
                  className="op-guide-card"
                >
                  <div className="op-guide-card-media">
                    <img src={post.coverImage || guideImages[index % guideImages.length]} alt="" loading="lazy" />
                    <span>{t('discovery.guidesCityGuide')}</span>
                  </div>
                  <div className="op-guide-card-copy gap-2">
                    <p className="op-guide-date">
                      {new Date(post.createdAt).toLocaleDateString(lang === 'sw' ? 'sw-KE' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <h2>{titles[index]}</h2>
                    {post.excerpt && (
                      <p>{excerpts[index]}</p>
                    )}
                    <span className="op-guide-link">
                      {t('discovery.guidesRead')}
                      <ChevronRight strokeWidth={2} aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default GuidesPage;
