import { useState, useEffect } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { Button, Spinner } from 'flowbite-react';
import { ChevronLeft } from 'lucide-react';
import apiClient from '../api/client.js';

const detailImages = [
  '/images/place-sarit-centre.jpg',
  '/images/place-karura-forest.jpg',
  '/images/eat-hero.jpg',
  '/images/place-nairobi-national-museum.jpg',
];

// The body arrives as sanitized HTML, so its typography is expressed as
// descendant utilities here instead of a stylesheet: every heading, list and
// link inside the article inherits the reading rhythm from this one element.
const BODY_PROSE =
  'text-base leading-relaxed text-charcoal '
  + '[&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:leading-tight [&_h2]:text-navy '
  + '[&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:leading-tight [&_h3]:text-navy '
  + '[&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-2 '
  + '[&_a]:text-primary-600 [&_a]:underline [&_strong]:font-semibold [&_strong]:text-navy '
  + '[&_img]:my-6 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-xl';

function GuideDetailPage() {
  const { slug: routeSlug } = useParams();
  const { pathname } = useLocation();
  const slug = routeSlug || pathname.split('/')[2];
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
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
      <main className="flex min-h-[60vh] items-center justify-center bg-white">
        <Spinner size="lg" aria-label="Loading guide" />
      </main>
    );
  }

  if (notFound || !post) {
    return (
      <main className="grid min-h-[60vh] place-items-center bg-white px-5 py-16">
        <div className="flex max-w-md flex-col items-center gap-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">Guide not found</p>
          <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">This story has moved</h1>
          <p className="text-sm leading-relaxed text-muted">The guide may have been removed or its address changed.</p>
          <Button as={Link} to="/guides" className="mt-4">Browse Guides</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[70vh] bg-white pb-20">
      <article className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 md:py-12">
        <Link
          to="/guides"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-primary-600"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          Back to Guides
        </Link>

        <img
          src={post.coverImage || detailImages[0]}
          alt={post.title}
          className="mt-6 aspect-[2/1] w-full rounded-xl border border-border bg-surface object-cover"
        />

        <header className="mt-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">City guide</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">{post.title}</h1>
          <p className="mt-2 text-sm text-muted">
            {new Date(post.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </header>

        <div
          className={`mt-6 ${BODY_PROSE}`}
          dangerouslySetInnerHTML={{ __html: post.body }}
        />
      </article>
    </main>
  );
}

export default GuideDetailPage;
