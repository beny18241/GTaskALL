import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      'date-fns': 'date-fns/esm',
      'date-fns/setMonth': 'date-fns/esm/setMonth',
      'date-fns/format': 'date-fns/esm/format',
      'date-fns/addDays': 'date-fns/esm/addDays'
    }
  },
  server: {
    host: true,
    port: 3000,
    strictPort: true,
    watch: {
      usePolling: true
    }
  },
  preview: {
    host: true,
    port: 3000,
    strictPort: true,
    allowedHosts: ['task.mpindela.com', '192.168.1.244']
  }
})
