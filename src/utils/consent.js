// Consent management for GDPR-compliant cookie choices.
//
// Persisted shape (localStorage key `zurilofts_consent`):
//   { necessary: true, analytics, marketing, policyVersion, decidedAt }
//
// `necessary` is always true - strictly-necessary cookies are never optional.
// `analytics` and `marketing` are opt-in and default to false until the user
// actively chooses. A `visitorId` is generated once (crypto.randomUUID) so
// pre-login consent can be linked to an account later.
//
// Every storage access is wrapped in try/catch because Safari private mode
// throws on write. On any failure we degrade to a safe default (no consent).

const STORAGE_KEY = 'zurilofts_consent';
const VISITOR_KEY = 'zurilofts_visitor_id';

// Single source of truth for the policy version. Consent records store this so
// a policy change can be detected and the user re-prompted.
export const POLICY_VERSION = '2026-08-08';

/** Read the stored consent. Returns null if the user has not decided. */
export function getConsent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.policyVersion !== POLICY_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** True once the user has made a consent choice for the current policy. */
export function hasDecided() {
  return getConsent() !== null;
}

/** Persist a consent choice. Silently no-ops on any storage failure. */
export function setConsent({ analytics, marketing }) {
  const consent = {
    necessary: true,
    analytics: Boolean(analytics),
    marketing: Boolean(marketing),
    policyVersion: POLICY_VERSION,
    decidedAt: Date.now(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  } catch {
    // Safari private mode / quota exceeded - degrade gracefully.
  }
  return consent;
}

/** Get or create the stable visitor id used to link pre-login consent. */
export function getVisitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    // Storage unavailable - fall back to a fresh id for this session.
    return crypto.randomUUID();
  }
}

/**
 * Reopen the consent banner in Manage mode. Dispatches a window event so any
 * mounted CookieConsent instance can react, matching the `open-chat` pattern
 * used by ChatWidget.
 */
export function openConsentManager() {
  window.dispatchEvent(new CustomEvent('open-consent-manager'));
}
