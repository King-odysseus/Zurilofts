import { useState } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications.js';
import { useAuth } from '../context/AuthContext.jsx';

function PushNotificationPrompt() {
  const { permission, isSupported, subscribe } = usePushNotifications();
  const { isAuthenticated, isLoading } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  // Only show for logged-in users, when supported, not already granted/denied, and not dismissed
  if (isLoading || !isAuthenticated || !isSupported || permission !== 'default' || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:bottom-4 sm:w-96 z-40 bg-white rounded-2xl border-2 border-[#C49A6C]/30 shadow-lg p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-[#C49A6C]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-5 h-5 text-[#C49A6C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#0B0B45]">Stay updated on your bookings</p>
          <p className="text-xs text-[#6b7280] mt-0.5">
            Get notified when your booking is confirmed and receive check-in reminders.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={async () => { await subscribe(); setDismissed(true); }}
              className="bg-[#C49A6C] text-white px-4 py-1.5 rounded-full text-xs font-semibold hover:bg-[#b8895c] transition-all duration-200"
            >
              Allow
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="text-xs text-[#6b7280] hover:text-[#1f2937] transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="text-[#D9D9D9] hover:text-[#6b7280] transition-colors flex-shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default PushNotificationPrompt;
