import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Spinner } from 'flowbite-react';
import { BookOpen, ChevronRight } from 'lucide-react';
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
      <main className="flex min-h-[60vh] items-center justify-center bg-white">
        <Spinner size="lg" aria-label="Loading guides" />
      </main>
    );
  }

  return (
    <main className="min-h-[70vh] bg-white">
      <header className="border-b border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 md:py-14">
          <nav className="flex flex-wrap items-center gap-2 text-xs text-muted" aria-label="Breadcrumb">
            <Link to="/" className="font-medium text-muted transition-colors hover:text-primary-600">Home</Link>
            <span aria-hidden="true">/</span>
            <span>Guides</span>
          </nav>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">City notes</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">Nairobi Travel Guides</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">Tips, recommendations, and local knowledge for making the most of your stay in Nairobi.</p>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 md:py-14">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-white px-5 py-16 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-primary-50 text-primary-600">
              <BookOpen className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            </span>
            <h2 className="text-base font-semibold text-navy">Guides are on the way</h2>
            <p className="max-w-md text-sm leading-relaxed text-muted">Our city notes are being prepared. Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, index) => (
              <Link
                key={post.id}
                to={`/guides/${post.slug}`}
                className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-surface">
                  <img
                    src={post.coverImage || guideImages[index % guideImages.length]}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <Badge color="gray" className="absolute left-3 top-3">City guide</Badge>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-primary-600">
                    {new Date(post.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <h2 className="text-xl font-bold leading-snug text-navy">{post.title}</h2>
                  {post.excerpt && (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{post.excerpt}</p>
                  )}
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-xs font-bold text-navy">
                    Read guide
                    <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default GuidesPage;
