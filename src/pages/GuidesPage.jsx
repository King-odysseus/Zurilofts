import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight } from 'lucide-react';
import Spinner from '../components/Spinner.jsx';
import apiClient from '../api/client.js';

const guideImages = [
  '/images/place-sarit-centre.jpg',
  '/images/place-un-hq.jpg',
  '/images/place-karura-forest.jpg',
  '/images/eat-hero.jpg',
  '/images/place-nairobi-national-museum.jpg',
  '/images/eat-artcaffe.jpg',
];

function GuidesPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get('/guides')
      .then((res) => setPosts(res.data.data || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

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
        <div className="op-content-container">
          <nav className="op-breadcrumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span>Guides</span>
          </nav>
          <span className="op-eyebrow">City notes</span>
          <h1>Nairobi Travel Guides</h1>
          <p>Tips, recommendations, and local knowledge for making the most of your stay in Nairobi.</p>
        </div>
      </header>

      <section className="op-guides-content">
        <div className="op-content-container">
          {posts.length === 0 ? (
            <div className="op-guides-empty">
              <div className="op-guides-empty-icon">
                <BookOpen strokeWidth={2} aria-hidden="true" />
              </div>
              <h2>Guides are on the way</h2>
              <p>Our city notes are being prepared. Check back soon.</p>
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
                    <span>City guide</span>
                  </div>
                  <div className="op-guide-card-copy">
                    <p className="op-guide-date">
                      {new Date(post.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <h2>{post.title}</h2>
                    {post.excerpt && (
                      <p>{post.excerpt}</p>
                    )}
                    <span className="op-guide-link">
                      Read guide
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
