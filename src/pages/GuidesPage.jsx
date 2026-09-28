import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
                <svg aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
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
                      <svg aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
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
