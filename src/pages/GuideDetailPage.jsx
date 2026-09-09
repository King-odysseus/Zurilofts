import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import Spinner from '../components/Spinner.jsx';
import PropertyCard from '../components/PropertyCard.jsx';
import apiClient from '../api/client.js';

// Assigns stable ids to h2/h3 headings in the guide's HTML body (parsed
// client-side, not from any backend change) so a desktop contents nav can
// jump to them. Falls back to the raw body and an empty TOC if the browser
// can't parse it for any reason - never blocks the article from rendering.
function useTableOfContents(html) {
  return useMemo(() => {
    if (!html || typeof DOMParser === 'undefined') return { html, toc: [] };
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const headings = doc.querySelectorAll('h2, h3');
      const seen = new Map();
      const toc = [];
      headings.forEach((h) => {
        const text = h.textContent.trim();
        if (!text) return;
        let slug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'section';
        const count = seen.get(slug) || 0;
        seen.set(slug, count + 1);
        if (count > 0) slug = `${slug}-${count}`;
        h.id = slug;
        toc.push({ id: slug, text, level: h.tagName === 'H3' ? 3 : 2 });
      });
      return { html: doc.body.innerHTML, toc };
    } catch {
      return { html, toc: [] };
    }
  }, [html]);
}

function GuideDetailPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [relatedStays, setRelatedStays] = useState([]);
  const [tocOpen, setTocOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiClient
      .get(`/guides/${slug}`)
      .then((res) => setPost(res.data.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    apiClient
      .get('/properties', { params: { limit: 3 } })
      .then((res) => setRelatedStays(res.data.data || []))
      .catch(() => setRelatedStays([]));
  }, []);

  const { html: bodyHtml, toc } = useTableOfContents(post?.body);

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
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="pt-24 pb-16 flex items-center justify-center min-h-[60vh]">
          <Spinner />
        </div>
        <Footer />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="pt-24 pb-16 flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md px-6">
            <h1 className="text-3xl font-bold text-[#222222] mb-4">Guide Not Found</h1>
            <p className="text-[#6b7280] mb-6">This guide may have been removed or moved.</p>
            <Link to="/guides" className="inline-block min-h-[44px] bg-[#C49A6C] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#B8895C] transition-all duration-200">
              Browse Guides
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Back link */}
      <div className="pt-24 max-w-5xl mx-auto px-4 sm:px-6">
        <Link
          to="/guides"
          className="inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-[#2563EB] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Guides
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 lg:grid lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-10 lg:items-start">
        <article className="max-w-3xl min-w-0">
          {/* Cover image */}
          {post.coverImage && (
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full aspect-[2/1] object-cover rounded-[14px] mt-4 mb-8"
            />
          )}

          {/* Title + meta */}
          <div className="rounded-[14px] border border-[#E5E7EB] bg-white px-5 py-6 sm:px-7 mb-8 shadow-sm">
          <h1 className="text-3xl md:text-4xl font-bold text-[#222222] mb-3">{post.title}</h1>
          <p className="text-[#6b7280] text-sm">
            {new Date(post.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          </div>

          {/* Contents - collapsed accordion on mobile/tablet, hidden here on
              desktop where the sticky sidebar (right) covers the same job. */}
          {toc.length > 0 && (
            <div className="mb-8 rounded-[14px] border border-[#E5E7EB] bg-white lg:hidden">
              <button
                type="button"
                onClick={() => setTocOpen((v) => !v)}
                aria-expanded={tocOpen}
                aria-controls="guide-toc-mobile"
                className="flex min-h-[44px] w-full items-center justify-between gap-2 px-5 py-3 text-left text-sm font-semibold text-[#222222]"
              >
                Contents
                <svg className={`h-4 w-4 text-[#6b7280] transition-transform ${tocOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {tocOpen && (
                <ul id="guide-toc-mobile" className="space-y-2 border-t border-[#E5E7EB] px-5 py-4">
                  {toc.map((item) => (
                    <li key={item.id} className={item.level === 3 ? 'ml-3' : ''}>
                      <a href={`#${item.id}`} onClick={() => setTocOpen(false)} className="text-sm text-[#2563EB] hover:text-[#1D4ED8]">{item.text}</a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Body */}
          <div
            className="prose prose-lg max-w-none prose-headings:text-[#222222] prose-a:text-[#2563EB] prose-img:rounded-[14px] prose-p:text-[#222222] prose-li:text-[#222222] prose-headings:scroll-mt-24"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />

          {/* Related stays */}
          {relatedStays.length > 0 && (
            <div className="mt-12 border-t border-[#E5E7EB] pt-8">
              <h2 className="mb-4 text-xl font-bold text-[#222222]">Related stays</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {relatedStays.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            </div>
          )}
        </article>

        {/* Desktop contents navigation - sticky beside the article */}
        {toc.length > 0 && (
          <nav aria-label="Table of contents" className="hidden lg:sticky lg:top-24 lg:block">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6b7280]">Contents</p>
            <ul className="space-y-2 border-l border-[#E5E7EB] pl-4">
              {toc.map((item) => (
                <li key={item.id} className={item.level === 3 ? 'ml-3' : ''}>
                  <a href={`#${item.id}`} className="text-sm text-[#6b7280] hover:text-[#2563EB] transition-colors">{item.text}</a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default GuideDetailPage;
