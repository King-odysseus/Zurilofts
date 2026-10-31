import PropTypes from 'prop-types';
import { CircleCheck, CigaretteOff, Eye, PawPrint, Plus, Users } from 'lucide-react';

// The left pane of the host listing editor: one card per section, each card a
// button that opens that section beside it. A stack of quiet cards rather than a
// navigation list, so the open one is marked with a navy ring instead of a fill.

const CARD =
  'w-full rounded-2xl bg-elevated p-5 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-navy/35 focus:outline-none';
const TITLE = 'block text-base font-semibold text-navy';
const LINE = 'mt-1 block whitespace-pre-line text-sm leading-relaxed text-muted';

// Three rows fit a phone without the card becoming a scroll area of its own;
// anything past that stays behind the pill.
const COLLAPSED_RULES = 3;

/** Rules carry an icon chosen from their own wording, as the reference does. */
function ruleIcon(rule) {
  const text = String(rule || '').toLowerCase();
  if (/pet|dog|cat|animal/.test(text)) return PawPrint;
  if (/smok|cigarette|vape/.test(text)) return CigaretteOff;
  if (/guest|people|person|occupan/.test(text)) return Users;
  return CircleCheck;
}

/** A section counts as customised once it holds anything worth showing a guest. */
function hasContent(section) {
  const lines = Array.isArray(section.lines) ? section.lines : [];
  const rules = Array.isArray(section.rules) ? section.rules : [];
  return lines.length > 0 || rules.length > 0;
}

export default function ArrivalSectionList({
  sections,
  activeKey,
  onSelect,
  showAllRules,
  onToggleRules,
  className = '',
}) {
  // Only one section carries rules, so the truncation and its pill are driven by
  // that section rather than by whichever card happened to render last.
  const rulesSection = sections.find(
    (section) => Array.isArray(section.rules) && section.rules.length > 0
  );
  const rules = rulesSection?.rules || [];
  const visibleRules = showAllRules ? rules : rules.slice(0, COLLAPSED_RULES);
  const hiddenRules = Math.max(rules.length - COLLAPSED_RULES, 0);
  const canToggleRules = hiddenRules > 0;

  // Filled sections read as a list of what this guide already says; the empty
  // ones collapse into a single "add" block, so the column shows progress and
  // an obvious next step rather than five identical "Add details" cards.
  const filledSections = sections.filter(hasContent);
  const emptySections = sections.filter((section) => !hasContent(section));
  const showGroupLabels = filledSections.length > 0 && emptySections.length > 0;

  return (
    <div className={['relative flex flex-col gap-4', className].filter(Boolean).join(' ')}>
      {showGroupLabels && filledSections.length > 0 ? (
        <span className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted">In your guide</span>
      ) : null}

      <div className="flex flex-col gap-4">
        {filledSections.map((section) => {
          const lines = Array.isArray(section.lines) ? section.lines : [];
          const isRulesCard = Boolean(rulesSection) && section.key === rulesSection.key;
          const isActive = activeKey !== '' && section.key === activeKey;

          return (
            <button
              key={section.key}
              type="button"
              onClick={() => onSelect(section.key)}
              aria-expanded={isActive}
              className={`${CARD} ${isActive ? 'ring-2 ring-navy' : 'ring-1 ring-transparent'}`}
            >
              <span className={TITLE}>{section.title}</span>

              {/* Index keys: the same wording can legitimately appear twice. */}
              {lines.map((line, index) => (
                <span key={`${section.key}-line-${index}`} className={LINE}>{line}</span>
              ))}

              {isRulesCard ? (
                <ul className="mt-2 flex flex-col">
                  {visibleRules.map((rule, index) => {
                    const Icon = ruleIcon(rule);
                    return (
                      <li key={`${section.key}-rule-${index}`} className="flex items-center gap-3 py-2">
                        <Icon className="h-5 w-5 shrink-0 text-navy" strokeWidth={1.8} aria-hidden="true" />
                        <span className="text-sm text-navy">{rule}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              {isRulesCard && hiddenRules > 0 && !showAllRules ? (
                <span className="mt-1 block text-xs text-muted">+ {hiddenRules} more</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {emptySections.length > 0 ? (
        <div className="flex flex-col gap-2">
          {showGroupLabels ? (
            <span className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Add to the guide</span>
          ) : null}
          <div className="overflow-hidden rounded-2xl bg-elevated shadow-sm ring-1 ring-transparent">
            {emptySections.map((section, index) => {
              const isActive = activeKey !== '' && section.key === activeKey;
              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => onSelect(section.key)}
                  aria-expanded={isActive}
                  className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface focus:outline-none focus-visible:bg-surface ${
                    index > 0 ? 'border-t border-border' : ''
                  } ${isActive ? 'bg-surface' : ''}`}
                >
                  <Plus className="h-4 w-4 shrink-0 text-muted" strokeWidth={2.2} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-navy">{section.title}</span>
                  {/* The open row says so, because its own card has no content
                      yet for the ring on a filled card to indicate. */}
                  <span className={`shrink-0 text-xs ${isActive ? 'font-semibold text-navy' : 'text-muted'}`}>
                    {isActive ? 'Editing' : section.placeholder || 'Add details'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* The pill only exists when something is actually hidden. It sits outside
          the cards because a button cannot be nested inside another button. */}
      {canToggleRules ? (
        <div className="sticky bottom-3 z-10 flex justify-center">
          <button
            type="button"
            onClick={onToggleRules}
            aria-expanded={showAllRules}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-navy-bg px-5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-navy-hover"
          >
            <Eye className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
            {showAllRules ? 'Show less' : 'View'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

const sectionShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  lines: PropTypes.arrayOf(PropTypes.string),
  rules: PropTypes.arrayOf(PropTypes.string),
  placeholder: PropTypes.string,
});

ArrivalSectionList.propTypes = {
  sections: PropTypes.arrayOf(sectionShape).isRequired,
  // An empty string means no section is open, which is why it is not optional.
  activeKey: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
  showAllRules: PropTypes.bool.isRequired,
  onToggleRules: PropTypes.func.isRequired,
  className: PropTypes.string,
};
