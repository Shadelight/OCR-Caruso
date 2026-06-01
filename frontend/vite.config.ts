import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

export default defineConfig({
  // Expone la versión de package.json al código del cliente como __APP_VERSION__.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-32x32.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Caruso Tech',
        short_name: 'Caruso Tech',
        description: 'Registro de equipos por OCR del IMEI para el taller Caruso Tech.',
        lang: 'es',
        theme_color: '#15181e',
        background_color: '#15181e',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precachea el shell (HTML/CSS/JS) para que abra sin internet.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // El SPA cae a index.html, pero nunca para las llamadas a la API.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/uploads/],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
    },
  },
});
