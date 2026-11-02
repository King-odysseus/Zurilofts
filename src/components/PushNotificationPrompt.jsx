import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications.js';
import { useAuth } from '../context/AuthContext.jsx';

function PushNotificationPrompt() {
  const { permission, isSupported, subscribe } = usePushNotifications();
  const { isAuthenticated, isLoading } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  // Shown to any signed-in person who has not already answered the browser's
  // permission question.
  //
  // This used to also require marketing-cookie consent, which meant a host who
  // never accepted marketing cookies could not be told their listing had been
  // rejected. A decision about your own listing is a service message, not
  // marketing, and the permission dialog below is the real consent, so that gate
  // is gone. Production had zero subscriptions for exactly this reason.
  if (
    isLoading ||
    !isAuthenticated ||
    !isSupported ||
    permission !== 'default' ||
    dismissed
  ) {
    return null;
  }

  return (
    <div className="fixed bottom-[calc(var(--zl-bottom-nav-space)_+_8px)] left-4 right-4 z-40 rounded-2xl bg-elevated p-4 shadow-[0_8px_28px_rgba(20,58,128,0.14)] md:bottom-4 md:left-auto md:right-4 md:w-96">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-[#F4F0E8] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bell className="w-5 h-5 text-[#8A6B52]" strokeWidth={2} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#203565]">Stay updated</p>
          <p className="mt-0.5 text-xs text-[#5B6B82]">
            Get a notification when a booking is confirmed, when a guest messages you, or when
            we reach a decision on one of your listings.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={async () => { await subscribe(); setDismissed(true); }}
              className="min-h-[36px] rounded-[10px] bg-[#143A80] px-4 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:bg-[#0B2A5E]"
            >
              Allow
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="text-xs text-[#5B6B82] transition-colors hover:text-[#203565]"
            >
              Not now
            </button>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="flex-shrink-0 text-[#94A3B8] transition-colors hover:text-[#5B6B82]">
          <X className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default PushNotificationPrompt;
