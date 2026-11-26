import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig, type UserConfig } from 'vite'

const config: UserConfig & { test: { globals: boolean; environment: string; setupFiles: string; css: boolean } } = {
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: { proxy: { '/api': { target: process.env.DEVPILOT_API_TARGET || 'http://127.0.0.1:8000', changeOrigin: true } } },
  preview: { proxy: { '/api': { target: process.env.DEVPILOT_API_TARGET || 'http://127.0.0.1:8000', changeOrigin: true } } },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'clsx', 'tailwind-merge', 'lucide-react', 'recharts', 'date-fns'],
    force: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
}

export default defineConfig(config)
