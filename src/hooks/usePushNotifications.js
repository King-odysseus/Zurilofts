import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import apiClient from '../api/client.js';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function usePushNotifications() {
  const { isAuthenticated } = useAuth();
  const [permission, setPermission] = useState(() => {
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission;
  });
  const [vapidKey, setVapidKey] = useState('');

  // Fetch VAPID public key from server
  useEffect(() => {
    apiClient.get('/push/vapid-public-key').then((res) => {
      setVapidKey(res.data.data?.publicKey || '');
    }).catch(() => {});
  }, []);

  const subscribe = useCallback(async () => {
    if (!isAuthenticated || !vapidKey) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // Already subscribed — save to backend
        const sub = subscription.toJSON();
        await apiClient.post('/push/subscribe', { endpoint: sub.endpoint, keys: sub.keys });
        setPermission('granted');
        return;
      }
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const sub = subscription.toJSON();
      await apiClient.post('/push/subscribe', { endpoint: sub.endpoint, keys: sub.keys });
      setPermission('granted');
    } catch (err) {
      console.warn('Push subscription failed:', err);
    }
  }, [isAuthenticated, vapidKey]);

  const unsubscribeFromPush = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await apiClient.delete('/push/unsubscribe', { data: { endpoint: subscription.endpoint } });
        await subscription.unsubscribe();
      }
      setPermission('denied');
    } catch { /* ignore */ }
  }, []);

  return {
    permission,
    isSupported: typeof Notification !== 'undefined' && 'serviceWorker' in navigator,
    subscribe,
    unsubscribe: unsubscribeFromPush,
  };
}
