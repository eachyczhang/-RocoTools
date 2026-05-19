import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
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
    },
  },
  build: {
    outDir: path.resolve(__dirname, '..', 'server', 'public'),
    emptyOutDir: true,
  },
})
