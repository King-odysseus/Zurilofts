import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getConsent } from '../utils/consent.js';

function PushNotificationPrompt() {
  const { permission, isSupported, subscribe } = usePushNotifications();
  const { isAuthenticated, isLoading } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  // Only show for logged-in users who have opted into marketing consent, when
  // supported, not already granted/denied, and not dismissed.
  const consent = getConsent();
  if (
    isLoading ||
    !isAuthenticated ||
    !consent?.marketing ||
    !isSupported ||
    permission !== 'default' ||
    dismissed
  ) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 rounded-2xl border border-[#E3E8EF] bg-elevated p-4 shadow-[0_8px_28px_rgba(20,58,128,0.14)] sm:bottom-4 sm:left-auto sm:right-4 sm:w-96">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-[#F4F0E8] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bell className="w-5 h-5 text-[#8A6B52]" strokeWidth={2} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#203565]">Stay updated on your bookings</p>
          <p className="mt-0.5 text-xs text-[#5B6B82]">
            Get notified when your booking is confirmed and receive check-in reminders.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={async () => { await subscribe(); setDismissed(true); }}
              className="min-h-[36px] rounded-[10px] bg-[#2563EB] px-4 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:bg-[#1D4ED8]"
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
