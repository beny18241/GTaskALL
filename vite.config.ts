import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'date-fns': 'date-fns/esm',
      'date-fns/setMonth': 'date-fns/esm/setMonth',
      'date-fns/format': 'date-fns/esm/format',
      'date-fns/addDays': 'date-fns/esm/addDays'
    }
  },
  preview: {
    host: true,
    port: 3000,
    allowedHosts: ['task.mpindela.com']
  }
})
