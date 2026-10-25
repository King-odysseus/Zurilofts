import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown } from 'lucide-react';

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

/** One contents row: a pill that tints on hover, matching the card inset. */
const rowClass = 'block rounded-lg px-3 py-2 text-[13px] leading-snug text-muted transition-colors hover:bg-white hover:text-ink';

/** Mobile collapsed accordion - place inside the main column, near the top. */
export function LegalPageContentsMobile({ containerRef }) {
  const items = useHeadingIds(containerRef);
  const [open, setOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <div className="mb-8 rounded-2xl border border-line bg-inset lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="legal-toc-mobile"
        className="flex min-h-[44px] w-full items-center justify-between gap-2 px-4 py-3 text-left text-[13px] font-semibold text-ink"
      >
        Contents
        <ChevronDown className={`h-4 w-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={2} aria-hidden="true" />
      </button>
      {open && (
        <ul id="legal-toc-mobile" className="space-y-0.5 border-t border-line px-2 py-2">
          {items.map((item) => (
            <li key={item.id}>
              <a href={`#${item.id}`} onClick={() => setOpen(false)} className={rowClass}>{item.text}</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
LegalPageContentsMobile.propTypes = { containerRef: containerRefProp };

/**
 * Desktop contents card - sits above the article in the same single column.
 * Long-form pages are one narrow column, so this is no longer a sticky sidebar.
 */
export function LegalPageContentsDesktop({ containerRef }) {
  const items = useHeadingIds(containerRef);
  if (items.length === 0) return null;

  return (
    <nav aria-label="Table of contents" className="mb-10 hidden rounded-2xl border border-line bg-inset p-3 lg:block">
      <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Contents</p>
      <ul className="max-h-[60vh] space-y-0.5 overflow-y-auto">
        {items.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`} className={rowClass}>{item.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
LegalPageContentsDesktop.propTypes = { containerRef: containerRefProp };
