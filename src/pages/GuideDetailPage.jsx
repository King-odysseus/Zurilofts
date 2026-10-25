import { useState, useEffect } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import Spinner from '../components/Spinner.jsx';
import apiClient from '../api/client.js';

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
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiClient
      .get(`/guides/${slug}`)
      .then((res) => setPost(res.data.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  // SEO meta
  useEffect(() => {
    if (post) {
      document.title = `${post.title} - ZuriLofts`;
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute('content', post.excerpt || post.title);
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', post.title);
    }
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

  if (notFound || !post) {
    return (
      <main className="op-public-page op-guide-detail-page">
        <div className="op-content-container op-public-loader">
          <div className="op-guide-not-found">
            <span>Guide not found</span>
            <h1>This story has moved</h1>
            <p>The guide may have been removed or its address changed.</p>
            <Link to="/guides" className="op-primary-action">
              Browse Guides
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="op-public-page op-guide-detail-page">
      <article className="op-content-container op-guide-detail">
        <Link
          to="/guides"
          className="op-directory-back"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
          Back to Guides
        </Link>

        <img
          src={post.coverImage || detailImages[0]}
          alt={post.title}
          className="op-guide-detail-cover"
        />

        <header className="op-guide-detail-header">
          <span className="op-eyebrow">City guide</span>
          <h1>{post.title}</h1>
          <p>
          {new Date(post.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </header>

        <div
          className="op-guide-detail-content"
          dangerouslySetInnerHTML={{ __html: post.body }}
        />
      </article>
    </main>
  );
}

export default GuideDetailPage;
