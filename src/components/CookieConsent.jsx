import { useState, useEffect } from 'react';

// Persisted consent shape: { choice: 'all' | 'essential', ts: number, version: number }
const STORAGE_KEY = 'zl-cookie-consent';
const CONSENT_VERSION = 1;

function readConsent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Re-prompt if the policy version has moved on.
    if (parsed?.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false); // drives the slide-up transition

  useEffect(() => {
    if (!readConsent()) {
      setOpen(true);
      // Next frame so the entrance transition runs.
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
  }, []);

  function save(choice) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ choice, ts: Date.now(), version: CONSENT_VERSION })
      );
    } catch {
      // localStorage unavailable (private mode / blocked) — dismiss anyway.
    }
    setVisible(false);
    // Let the exit transition finish before unmounting.
    setTimeout(() => setOpen(false), 300);
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
            <h2 className="text-base font-semibold text-[#0B0B45]">We value your privacy</h2>
            <p className="text-sm text-[#6b7280] mt-1 leading-relaxed">
              We use essential cookies to keep you signed in and your bookings working, plus
              optional cookies to understand how the site is used. Read our{' '}
              <a href="/privacy#cookies" className="text-[#C49A6C] hover:underline font-medium">
                Cookie Policy
              </a>
              .
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => save('essential')}
            className="px-5 py-2 rounded-full border border-[#D9D9D9] text-[#0B0B45] text-sm font-medium hover:bg-[#f8f9fa] transition-colors duration-200"
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={() => save('all')}
            className="px-5 py-2 rounded-full bg-[#C49A6C] text-[#0B0B45] text-sm font-semibold hover:brightness-105 transition-all duration-200"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}

export default CookieConsent;
