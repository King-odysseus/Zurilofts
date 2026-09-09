import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

// Scans the rendered article for h2 headings and assigns each a stable id
// (derived from its own text) so a contents nav can link to them - no
// change to the policy text itself, and no ids to maintain by hand across
// two long static pages. Both the mobile and desktop nav call this
// independently; re-scanning the same handful of headings twice is cheap.
function useHeadingIds(containerRef) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const headings = container.querySelectorAll('h2');
    const seen = new Map();
    const next = [];
    headings.forEach((h) => {
      const text = h.textContent.trim();
      if (!text) return;
      let slug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'section';
      const count = seen.get(slug) || 0;
      seen.set(slug, count + 1);
      if (count > 0) slug = `${slug}-${count}`;
      h.id = slug;
      h.classList.add('scroll-mt-24');
      next.push({ id: slug, text });
    });
    setItems(next);
  }, [containerRef]);

  return items;
}

const containerRefProp = PropTypes.shape({ current: PropTypes.any }).isRequired;

/** Mobile collapsed accordion - place inside the main column, near the top. */
export function LegalPageContentsMobile({ containerRef }) {
  const items = useHeadingIds(containerRef);
  const [open, setOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <div className="mb-8 rounded-[14px] border border-[#E5E7EB] bg-white lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="legal-toc-mobile"
        className="flex min-h-[44px] w-full items-center justify-between gap-2 px-5 py-3 text-left text-sm font-semibold text-[#222222]"
      >
        Contents
        <svg className={`h-4 w-4 text-[#6b7280] transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <ul id="legal-toc-mobile" className="space-y-2 border-t border-[#E5E7EB] px-5 py-4">
          {items.map((item) => (
            <li key={item.id}>
              <a href={`#${item.id}`} onClick={() => setOpen(false)} className="text-sm text-[#2563EB] hover:text-[#1D4ED8]">{item.text}</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
LegalPageContentsMobile.propTypes = { containerRef: containerRefProp };

/** Desktop sticky sidebar - place as a grid sibling beside the article. */
export function LegalPageContentsDesktop({ containerRef }) {
  const items = useHeadingIds(containerRef);
  if (items.length === 0) return null;

  return (
    <nav aria-label="Table of contents" className="hidden lg:sticky lg:top-24 lg:block">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6b7280]">Contents</p>
      <ul className="max-h-[70vh] space-y-2 overflow-y-auto border-l border-[#E5E7EB] pl-4">
        {items.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`} className="text-sm text-[#6b7280] hover:text-[#2563EB] transition-colors">{item.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
LegalPageContentsDesktop.propTypes = { containerRef: containerRefProp };
