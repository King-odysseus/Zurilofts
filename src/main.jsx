import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ModeProvider } from './context/ModeContext.jsx'
import { FavoritesProvider } from './context/FavoritesContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { ThemeProvider as FlowbiteThemeProvider } from 'flowbite-react'
import { brandTheme } from './theme/flowbiteTheme.js'
import './styles.css'

// A service worker left behind by an earlier build keeps serving the shell it
// precached, so a dev-server change never reaches the page: one device shows the
// new menu while another still shows the old one. There is no offline support to
// protect in development, so any worker and its caches are dropped on load.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  const CLEARED = 'zuri-dev-sw-cleared';
  navigator.serviceWorker.getRegistrations()
    .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
    .then(() => (typeof caches === 'undefined' ? [] : caches.keys()))
    .then((keys) => Promise.all((keys || []).map((key) => caches.delete(key))))
    .then(() => {
      // Unregistering does not release the worker already controlling this page,
      // so it would keep replaying its cached shell until the next navigation.
      // One reload clears it; the stored flag stops a reload loop.
      if (hadController && !sessionStorage.getItem(CLEARED)) {
        sessionStorage.setItem(CLEARED, '1');
        window.location.reload();
      }
    })
    .catch((workerError) => console.warn('Could not clear a stale service worker:', workerError));
}

// PWA update handling - when a new service worker activates, reload so the
// user is always on the latest version (registerType: 'autoUpdate').
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <FlowbiteThemeProvider theme={brandTheme}>
      <ThemeProvider>
        <LanguageProvider>
          <ToastProvider>
            <AuthProvider>
              <ModeProvider>
                <FavoritesProvider>
                  <App />
                </FavoritesProvider>
              </ModeProvider>
            </AuthProvider>
          </ToastProvider>
        </LanguageProvider>
      </ThemeProvider>
    </FlowbiteThemeProvider>
  </React.StrictMode>,
)
