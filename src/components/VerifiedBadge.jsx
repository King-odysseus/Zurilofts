import PropTypes from 'prop-types';
import { BadgeCheck } from 'lucide-react';

/**
 * The "verified" mark shown wherever one person's identity is presented to
 * another: a host on a listing, a guest on a host's reservation.
 *
 * The caller decides whether to render it at all (`{verified && <VerifiedBadge />}`),
 * because "not verified" is the silent default. A badge that says "not verified"
 * would read as an accusation rather than as an absence of one.
 *
 * Colours are the two hexes styles.css already remaps for dark mode
 * (`bg-[#E7F6EE]` -> #12291E, `text-[#157347]` -> #7BD8A5). Using any other pale
 * hex here would stay light-on-dark and become unreadable, which is exactly the
 * trap the arbitrary-hex remap exists to avoid.
 *
 * The icon is aria-hidden and the same meaning is carried in text: the visible
 * label alone is enough for a short badge, and `hint` is exposed to everyone
 * through `title` plus a screen-reader-only span, because a title attribute is
 * only surfaced on hover and never to a keyboard or touch user.
 */
function VerifiedBadge({ label, hint, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-[#E7F6EE] px-2.5 py-1 text-xs font-semibold text-[#157347] ${className}`.trimEnd()}
      title={hint || undefined}
    >
      <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
      <span>{label}</span>
      {hint ? <span className="sr-only">. {hint}</span> : null}
    </span>
  );
}

VerifiedBadge.propTypes = {
  // The short visible word, already translated by the caller.
  label: PropTypes.string.isRequired,
  // Optional one-line explanation of what was verified.
  hint: PropTypes.string,
  className: PropTypes.string,
};

export default VerifiedBadge;
