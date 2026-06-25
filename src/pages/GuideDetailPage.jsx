import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import Spinner from '../components/Spinner.jsx';
import apiClient from '../api/client.js';

function GuideDetailPage() {
  const { slug } = useParams();
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
      document.title = `${post.title} — ZuriLofts`;
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
            <h1 className="text-3xl font-bold text-[#0B0B45] mb-4">Guide Not Found</h1>
            <p className="text-[#6b7280] mb-6">This guide may have been removed or moved.</p>
            <Link to="/guides" className="inline-block bg-[#C49A6C] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#b8895c] transition-all duration-200">
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
      <div className="pt-24 max-w-3xl mx-auto px-4 sm:px-6">
        <Link
          to="/guides"
          className="inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-[#C49A6C] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Guides
        </Link>
      </div>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        {/* Cover image */}
        {post.coverImage && (
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full aspect-[2/1] object-cover rounded-2xl mt-4 mb-8"
          />
        )}

        {/* Title + meta */}
        <h1 className="text-3xl md:text-4xl font-bold text-[#0B0B45] mb-3">{post.title}</h1>
        <p className="text-[#6b7280] text-sm mb-8">
          {new Date(post.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        {/* Body */}
        <div
          className="prose prose-lg max-w-none prose-headings:text-[#0B0B45] prose-a:text-[#C49A6C] prose-img:rounded-2xl prose-p:text-[#1f2937] prose-li:text-[#1f2937]"
          dangerouslySetInnerHTML={{ __html: post.body }}
        />
      </article>

      <Footer />
    </div>
  );
}

export default GuideDetailPage;
