import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx']
  },
  server: {
    port: 3000,
    strictPort: true,
    hmr: {
      overlay: true
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@react-oauth/google', 'gapi-script'],
    exclude: ['@react-oauth/google']
  }
}) 