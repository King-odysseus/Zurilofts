import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import apiClient from "../api/client.js";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import Spinner from "../components/Spinner.jsx";

export default function SharedShortlistPage() {
  const { token } = useParams();
  const [shortlist, setShortlist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = "Shared Shortlist | ZuriLofts";
    let cancelled = false;
    async function fetch() {
      try {
        setLoading(true);
        const res = await apiClient.get(`/shortlists/shared/${token}`);
        if (!cancelled) setShortlist(res.data.data);
      } catch {
        if (!cancelled) setError("This shortlist could not be found or is no longer available.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetch();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#D9D9D9]/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[#0B0B45] mb-1">Not found</h3>
            <p className="text-[#6b7280] max-w-sm mx-auto">{error}</p>
          </div>
        ) : shortlist ? (
          <>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0B0B45] mb-1">{shortlist.name}</h1>
            <p className="text-[#6b7280] mb-8">
              {shortlist.items?.length ?? 0} {shortlist.items?.length === 1 ? "property" : "properties"} saved
            </p>

            {(!shortlist.items || shortlist.items.length === 0) ? (
              <div className="text-center py-16">
                <p className="text-[#6b7280]">This shortlist has no saved properties yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {shortlist.items.map((item) => {
                  const p = item.property || {};
                  const image = p.images?.[0];
                  return (
                    <Link
                      key={item.id}
                      to={`/property/${p.id}`}
                      className="group block bg-white border border-[#D9D9D9]/50 rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      <div className="flex flex-col sm:flex-row">
                        <div className="sm:w-40 lg:w-48 flex-shrink-0 overflow-hidden">
                          <img
                            src={image || "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&q=80"}
                            alt={p.title}
                            className="w-full h-32 sm:h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                        <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
                          <h3 className="text-sm font-semibold text-[#1f2937] group-hover:text-[#C49A6C] transition-colors line-clamp-1">
                            {p.title}
                          </h3>
                          <p className="text-xs text-[#6b7280] mt-0.5 flex items-center gap-1">
                            <svg className="w-3 h-3 text-[#C49A6C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {p.location || "Nairobi"}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-[#6b7280]">
                            {p.rating > 0 && (
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5 text-[#C49A6C] fill-current" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                {p.rating}
                              </span>
                            )}
                            {p.bedrooms && <span>{p.bedrooms} {p.bedrooms === 1 ? "bed" : "beds"}</span>}
                            {p.type && <span className="capitalize">{p.type}</span>}
                          </div>
                          <p className="text-sm font-semibold text-[#0B0B45] mt-2">
                            KES {p.price?.toLocaleString()}
                            <span className="text-xs font-normal text-[#6b7280]"> /night</span>
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            <div className="mt-12 pt-6 border-t border-[#D9D9D9] text-center">
              <p className="text-xs text-[#6b7280]">
                Created with{" "}
                <Link to="/" className="text-[#C49A6C] hover:text-[#0B0B45] font-medium transition-colors">
                  ZuriLofts
                </Link>
                {" "}&mdash; premium short-let apartments in Nairobi
              </p>
            </div>
          </>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
