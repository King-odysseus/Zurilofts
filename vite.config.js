import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Stamps each build into index.html so its precache revision always changes.
 *
 * Workbox precaches index.html and serves every navigation from that cached
 * RESPONSE - headers included. Precache entries are keyed on a hash of the
 * file's content, so a server-only change (a security header, say) leaves
 * index.html byte-identical, the revision unchanged, and the service worker
 * never re-fetches it. Clients then keep replaying the old headers forever.
 *
 * That is exactly how the OpenStreetMap CSP fix in 56c8c71 failed to reach
 * devices that had already cached the shell: their maps stayed blank because
 * the stale header still blocked every tile, while fresh browsers were fine.
 *
 * A per-build stamp keeps the revision moving so each deploy re-delivers the
 * document and whatever headers currently come with it.
 */
function buildStamp() {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    name: 'zuri-build-stamp',
    apply: 'build',
    transformIndexHtml() {
      return [{ tag: 'meta', attrs: { name: 'zuri-build', content: id }, injectTo: 'head' }];
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    buildStamp(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'ZuriLofts',
        short_name: 'ZuriLofts',
        description: 'Premium Short-Let Apartments in Nairobi',
        theme_color: '#0B0B45',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        importScripts: ['/push-handler.js'],
        globPatterns: ['**/*.{js,css,html,woff2,svg,png,jpg,jpeg,gif}'],
        navigateFallback: '/index.html', // SPA shell for offline/deep links
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // Only public browsing data is worth (and safe to) caching. The broad
            // "/api/* minus auth" rule this replaced put private GET responses -
            // a guest's bookings, messages, notifications - on disk in the Cache
            // Storage. Property + blog endpoints are public GET reads; everything
            // else (auth, bookings, messages, uploads, admin) is uncached.
            urlPattern: ({ url }) => {
              const p = url.pathname;
              if (p === '/api/properties') return true;
              if (
                p.startsWith('/api/properties/') &&
                !p.startsWith('/api/properties/mine') &&
                !p.startsWith('/api/properties/bulk')
              ) {
                return true;
              }
              if (p.startsWith('/api/guides')) return true;
              if (p.startsWith('/api/reviews/summary')) return true;
              return false;
            },
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 }, // 1 hour
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // disable SW in dev to avoid caching headaches
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Split heavyweight PDF/imaging libs into their own chunks so the
        // main app bundle stays small. Only loaded when the earnings page
        // actually mounts (via React.lazy).
        manualChunks: {
          'pdf-export': ['jspdf', 'jspdf-autotable'],
          'html2canvas': ['html2canvas'],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // Optimized property images uploaded through the admin panel are served
      // by the backend; proxy them in dev so they render at /uploads/*.
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
