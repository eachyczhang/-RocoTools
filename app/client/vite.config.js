import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  base: '/rocotools/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Precache build assets
        globPatterns: ['**/*.{js,css,html,ico,woff2}'],

        // Runtime caching strategies
        runtimeCaching: [
          // Pet thumbnails - Cache First (high frequency, small files)
          {
            urlPattern: /\/public\/pets\/thumbs\/.+\.webp$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'img-thumbs',
              expiration: { maxEntries: 600, maxAgeSeconds: 30 * 24 * 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Pet artwork (default/shiny) - Cache First
          {
            urlPattern: /\/public\/pets\/(default|shiny)\/.+\.(png|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'img-pets',
              expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Icons (skills/elements/abilities) - Cache First
          {
            urlPattern: /\/public\/(skills\/icons|elements\/icons|pets\/abilities)\/.+\.png$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'img-icons',
              expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Uploaded images - Cache First
          {
            urlPattern: /\/uploads\/.+\.(png|webp|jpg|jpeg)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'img-uploads',
              expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // API - Network Only (always fresh data)
          {
            urlPattern: /\/api\//,
            handler: 'NetworkOnly',
          },
        ],

        // SPA navigation fallback
        navigateFallback: '/rocotools/index.html',
        navigateFallbackAllowlist: [/^\/rocotools\//],
        navigateFallbackDenylist: [/^\/api\//, /^\/public\//, /^\/uploads\//],
      },

      // PWA Manifest
      manifest: {
        name: 'RocoTools - 洛克王国世界数据工具',
        short_name: 'RocoTools',
        description: '洛克王国世界游戏数据查询与分析工具',
        theme_color: '#D69F23',
        background_color: '#1a1a2e',
        display: 'standalone',
        scope: '/rocotools/',
        start_url: '/rocotools/',
        icons: [
          { src: 'favicon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/public': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
    },
  },
  build: {
    outDir: path.resolve(__dirname, '..', 'server', 'public'),
    emptyOutDir: true,
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router'],
        },
      },
    },
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
})
