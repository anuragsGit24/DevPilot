import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig, type UserConfig } from 'vite'

const config: UserConfig & { test: { globals: boolean; environment: string; setupFiles: string; css: boolean } } = {
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
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
