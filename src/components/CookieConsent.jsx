import { useState, useEffect } from 'react';
import apiClient from '../api/client.js';
import {
  getConsent,
  setConsent,
  getVisitorId,
  POLICY_VERSION,
} from '../utils/consent.js';

// Category definitions shared by the banner and the preference manager.
const CATEGORIES = [
  {
    key: 'necessary',
    label: 'Strictly necessary',
    description:
      'Required for core functionality - keeping you signed in and your bookings working. These are always on and cannot be disabled.',
    alwaysOn: true,
  },
  {
    key: 'analytics',
    label: 'Analytics',
    description:
      'Helps us understand how the site is used so we can improve it. Off by default.',
    alwaysOn: false,
  },
  {
    key: 'marketing',
    label: 'Marketing',
    description:
      'Lets us show you relevant offers and updates. Off by default.',
    alwaysOn: false,
  },
];

function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false); // drives the slide-up transition
  const [mode, setMode] = useState('banner'); // 'banner' | 'manage'
  const [prefs, setPrefs] = useState({ analytics: false, marketing: false });

  // Show the banner on first visit (no stored decision for the current policy).
  useEffect(() => {
    if (!getConsent()) {
      setOpen(true);
      // Next frame so the entrance transition runs.
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
  }, []);

  // Reopen in Manage mode when the consent manager is requested (footer/profile).
  useEffect(() => {
    function handleOpenManager() {
      setPrefs({ analytics: false, marketing: false });
      setMode('manage');
      setOpen(true);
      requestAnimationFrame(() => setVisible(true));
    }
    window.addEventListener('open-consent-manager', handleOpenManager);
    return () => window.removeEventListener('open-consent-manager', handleOpenManager);
  }, []);

  function close() {
    setVisible(false);
    // Let the exit transition finish before unmounting.
    setTimeout(() => setOpen(false), 300);
  }

  // Persist locally, then best-effort sync to the server. Never block the UI
  // if the network call fails - the local choice is authoritative for this
  // session and the server can be reconciled later.
  function save(analytics, marketing) {
    const consent = setConsent({ analytics, marketing });
    close();
    apiClient
      .post('/consent', {
        analytics: consent.analytics,
        marketing: consent.marketing,
        policyVersion: POLICY_VERSION,
        visitorId: getVisitorId(),
      })
      .catch(() => {
        // Silent - local choice already stored.
      });
  }

  function handleAcceptAll() {
    save(true, true);
  }

  function handleRejectAll() {
    save(false, false);
  }

  function handleSaveChoices() {
    save(prefs.analytics, prefs.marketing);
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className={`fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-50 transition-all duration-300 ease-out ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
      }`}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-[#D9D9D9] p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#C49A6C]/15 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#C49A6C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9h.01M15 13h.01M10 15h.01M14 9h.01" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#0B0B45]">
              {mode === 'manage' ? 'Manage your preferences' : 'We value your privacy'}
            </h2>
            <p className="text-sm text-[#6b7280] mt-1 leading-relaxed">
              {mode === 'manage'
                ? 'Choose which optional cookies we may use. Strictly necessary cookies are always on.'
                : 'We use essential cookies to keep you signed in and your bookings working, plus optional cookies to understand how the site is used. Read our '}
              {mode === 'banner' && (
                <>
                  <a href="/privacy#cookies" className="text-[#C49A6C] hover:underline font-medium">
                    Cookie Policy
                  </a>
                  .
                </>
              )}
            </p>
          </div>
        </div>

        {mode === 'manage' && (
          <div className="space-y-3 mb-4">
            {CATEGORIES.map((cat) => (
              <div
                key={cat.key}
                className="flex items-start justify-between gap-3 rounded-xl border border-[#D9D9D9] p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#0B0B45]">{cat.label}</p>
                  <p className="text-xs text-[#6b7280] mt-0.5 leading-relaxed">{cat.description}</p>
                </div>
                {cat.alwaysOn ? (
                  <span className="flex-shrink-0 text-xs font-medium text-[#6b7280] bg-[#f8f9fa] rounded-full px-3 py-1.5">
                    Always on
                  </span>
                ) : (
                  <label className="flex-shrink-0 flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs[cat.key]}
                      onChange={(e) => setPrefs((prev) => ({ ...prev, [cat.key]: e.target.checked }))}
                      className="w-4 h-4 accent-[#C49A6C]"
                    />
                    <span className="sr-only">{cat.label}</span>
                  </label>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          {mode === 'manage' ? (
            <button
              type="button"
              onClick={handleSaveChoices}
              className="px-5 py-2 rounded-full bg-[#C49A6C] text-[#0B0B45] text-sm font-semibold hover:brightness-105 transition-all duration-200"
            >
              Save choices
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="px-5 py-2 rounded-full bg-[#C49A6C] text-[#0B0B45] text-sm font-semibold hover:brightness-105 transition-all duration-200"
              >
                Accept all
              </button>
              <button
                type="button"
                onClick={handleRejectAll}
                className="px-5 py-2 rounded-full bg-[#0B0B45] text-white text-sm font-semibold hover:brightness-110 transition-all duration-200"
              >
                Reject all
              </button>
              <button
                type="button"
                onClick={() => setMode('manage')}
                className="px-5 py-2 rounded-full border border-[#D9D9D9] text-[#0B0B45] text-sm font-semibold hover:bg-[#f8f9fa] transition-colors duration-200"
              >
                Manage preferences
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CookieConsent;
