import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { HomeHeader } from "./HomePage.jsx";
import Footer from "../components/Footer.jsx";
import Spinner from "../components/Spinner.jsx";
import apiClient from "../api/client.js";
import { PLACES_TO_EAT, PLACES_TO_VISIT } from "../data/nearby.js";

const EDITORIAL_GUIDES = [
  {
    title: "A first weekend in Nairobi",
    slug: "first-weekend-in-nairobi",
    eyebrow: "Getting started",
    description:
      "Land in Nairobi with a plan that still leaves room for surprise. We map out a gentle first weekend: a slow coffee, one museum, a leafy walk, and the golden-hour view locals keep coming back to.",
    readTime: "6 min read",
    image: PLACES_TO_VISIT.find((item) => item.category === "culture")?.image,
  },
  {
    title: "Where to eat like a local",
    slug: "where-to-eat-like-a-local",
    eyebrow: "Food & drink",
    description:
      "Nairobi’s best meals are often tucked behind an unassuming door. This guide moves from smoky nyama choma and crisp samosas to thoughtful tasting menus, with notes on when to go and what to order.",
    readTime: "8 min read",
    image: PLACES_TO_EAT.find((item) => item.category === "kenyan")?.image,
  },
  {
    title: "Nairobi outdoors",
    slug: "nairobi-outdoors",
    eyebrow: "Nature & wellness",
    description:
      "Trade traffic for birdsong, red earth, and wide-open skies. We share three easy escapes, what to pack, and the small details that make a Nairobi outdoor day feel unhurried.",
    readTime: "5 min read",
    image: PLACES_TO_VISIT.find((item) => item.category === "nature")?.image,
  },
];

function GuideImage({ src, alt }) {
  return src ? (
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      loading="lazy"
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-[#EAF0F6] text-[#B8895C]">
      <svg
        className="h-10 w-10"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    </div>
  );
}

function GuidesPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  useEffect(() => {
    apiClient
      .get("/guides")
      .then((res) => setPosts(res.data.data || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);
  const filteredPosts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter(
      (post) =>
        !q || `${post.title} ${post.excerpt || ""}`.toLowerCase().includes(q),
    );
  }, [posts, query]);
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F8FAFC] text-[#0B1F42]">
      <HomeHeader
        propertiesPage
        searchLabel="Search guides"
        searchPath="/guides"
      />
      <main>
        <section className="mx-auto max-w-[1200px] px-4 pb-6 pt-7 md:px-8 md:pt-8">
          <p className="text-xs text-[#5B6B82]">
            Home <span className="mx-1">›</span> Guides
          </p>
          <div className="mt-2 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight md:text-[32px]">
                Nairobi travel guides
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-[#5B6B82] md:text-base">
                Thoughtful recommendations and local context for making the most
                of your stay.
              </p>
            </div>
            <div className="flex min-h-11 w-full items-center rounded-full border border-[#E3E8EF] bg-white px-4 md:w-72">
              <svg
                className="mr-2 h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
              <label htmlFor="guide-search" className="sr-only">
                Search guides
              </label>
              <input
                id="guide-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search guides"
                className="discovery-search-input min-w-0 flex-1 border-0 bg-transparent py-2 text-xs outline-none ring-0 placeholder:text-[#94A3B8] focus:border-0 focus:outline-none focus:ring-0"
              />
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-[1200px] px-4 pb-16 md:px-8">
          {loading ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <>
              {filteredPosts.length > 0 && (
                <Link
                  to={`/guides/${filteredPosts[0].slug}`}
                  className="group mb-8 grid overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_rgba(11,31,66,0.07)] md:grid-cols-2"
                >
                  <div className="aspect-[16/10] overflow-hidden md:aspect-auto">
                    <GuideImage
                      src={filteredPosts[0].coverImage}
                      alt={filteredPosts[0].title}
                    />
                  </div>
                  <div className="flex flex-col justify-center p-6 md:p-9">
                    <span className="w-fit rounded-full bg-[#C49A6C]/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[.1em] text-[#B8895C]">
                      Featured guide
                    </span>
                    <h2 className="mt-4 text-2xl font-semibold tracking-tight group-hover:text-[#B8895C] md:text-[30px]">
                      {filteredPosts[0].title}
                    </h2>
                    {filteredPosts[0].excerpt && (
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#5B6B82]">
                        {filteredPosts[0].excerpt}
                      </p>
                    )}
                    <span className="mt-5 text-xs font-semibold text-[#B8895C]">
                      {filteredPosts[0].readingTime || "7 min read"} · Read
                      guide ↗
                    </span>
                  </div>
                </Link>
              )}
              {filteredPosts.length > 1 && (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredPosts.slice(1).map((post) => (
                    <Link
                      key={post.id}
                      to={`/guides/${post.slug}`}
                      className="group relative min-w-0"
                    >
                      <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-[#E7EDF4]">
                        <GuideImage src={post.coverImage} alt={post.title} />
                      </div>
                      <div className="pt-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#B8895C]">
                          Nairobi field notes
                        </p>
                        <h2 className="text-lg font-semibold group-hover:text-[#B8895C]">
                          {post.title}
                        </h2>
                        {post.excerpt && (
                          <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#5B6B82]">
                            {post.excerpt}
                          </p>
                        )}
                        <span className="mt-4 inline-flex text-xs font-semibold text-[#B8895C]">
                          {post.readingTime || "6 min read"} · Read guide ↗
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {filteredPosts.length === 0 && (
                <>
                  <div className="mb-7 grid gap-5 md:grid-cols-3">
                    {EDITORIAL_GUIDES.map((guide) => (
                      <Link
                        key={guide.title}
                        to={`/guides/${guide.slug}`}
                        className="group relative min-w-0"
                      >
                        <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-[#E7EDF4]">
                          <GuideImage src={guide.image} alt={guide.title} />
                        </div>
                        <div className="pt-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#B8895C]">
                            {guide.eyebrow}
                          </p>
                          <h2 className="mt-2 text-lg font-semibold group-hover:text-[#B8895C]">
                            {guide.title}
                          </h2>
                          <p className="mt-2 text-sm leading-6 text-[#5B6B82]">
                            {guide.description}
                          </p>
                          <span className="mt-4 inline-flex text-xs font-semibold text-[#B8895C]">
                            {guide.readTime} · Read guide ↗
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <div className="rounded-2xl border border-[#E3E8EF] bg-white p-6 text-center">
                    <p className="text-sm text-[#5B6B82]">
                      More in-depth guides are on the way. Start exploring
                      Nairobi’s neighbourhoods and restaurants meanwhile.
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default GuidesPage;
