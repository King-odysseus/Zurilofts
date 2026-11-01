import { useId } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Button } from 'flowbite-react';
import { CircleAlert, Clock3 } from 'lucide-react';

/**
 * The reminder that someone still has to finish proving who they are.
 *
 * Two audiences share it: a host whose host application is unfinished, and a
 * guest whose identity is not yet verified. Neither was reminded anywhere
 * before - the only signal lived inside the application form or behind a small
 * link on the profile, so a person who never opened those pages could go weeks
 * without knowing why they could not publish a listing or pay for a stay.
 *
 * It is deliberately loud enough to notice and quiet enough to sit above real
 * content: a tinted band, an icon, a one-line title, and one action.
 *
 * The three tints are pale hexes on purpose. src/styles.css already remaps each
 * of these exact strings to a dark surface under `html.dark [class*="bg-[#...]"]`,
 * so dark mode needs no separate classes here - and picking a hex that is NOT
 * in that list would leave a bright block on a dark page. The title uses
 * text-navy and the body text-charcoal, both of which flip with the theme.
 */
const TONES = {
  attention: { shell: 'bg-[#FDF3D8]', ink: 'text-[#8A5A00]', Icon: CircleAlert },
  review: { shell: 'bg-[#EEF2F7]', ink: 'text-[#203565]', Icon: Clock3 },
  rejected: { shell: 'bg-[#FDECEC]', ink: 'text-[#B42318]', Icon: CircleAlert },
};

function VerificationNudge({ tone = 'attention', icon, title, description, actionLabel, to, className = '' }) {
  // Several nudges can be on screen if this is reused elsewhere, so the heading
  // id has to be unique or a screen reader would announce the wrong title.
  const titleId = useId();
  const { shell, ink, Icon } = TONES[tone] || TONES.attention;
  // Some notices are about one specific thing rather than a general warning -
  // an unfinished profile is about the person's own details, which a warning
  // triangle cannot say. A caller that passes an icon replaces the tone default;
  // every caller that does not keeps the tone icon and its styling untouched.
  const NudgeIcon = icon || Icon;

  return (
    // A single row at every width would let the button squeeze the sentence
    // into a narrow column on a phone, so the layout is one column (text, then
    // action beneath) until there is room for two. `minmax(0,1fr)` and
    // `min-w-0` keep long translated copy from forcing the band wider than the
    // page.
    <section
      aria-labelledby={titleId}
      className={[
        'grid grid-cols-1 gap-3 rounded-xl p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center',
        shell,
        className,
      ].filter(Boolean).join(' ')}
    >
      <div className="flex items-start gap-3">
        <NudgeIcon className={`mt-0.5 h-5 w-5 shrink-0 ${ink}`} strokeWidth={2} aria-hidden="true" />
        <div className="min-w-0">
          <h2 id={titleId} className="text-sm font-semibold text-navy">{title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-charcoal">{description}</p>
        </div>
      </div>
      {to && actionLabel && (
        <Button as={Link} to={to} size="sm" className="shrink-0 justify-self-start sm:justify-self-end">
          {actionLabel}
        </Button>
      )}
    </section>
  );
}

VerificationNudge.propTypes = {
  tone: PropTypes.oneOf(['attention', 'review', 'rejected']),
  // A component, not an element: the nudge decides its size, colour and
  // aria-hidden treatment so an icon cannot arrive half-styled.
  icon: PropTypes.elementType,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  actionLabel: PropTypes.string,
  to: PropTypes.string,
  className: PropTypes.string,
};

export default VerificationNudge;
