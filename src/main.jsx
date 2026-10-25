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
import './tailwind.css'

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
