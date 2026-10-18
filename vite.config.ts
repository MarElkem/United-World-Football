import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // Relative asset paths so the build can be served from any folder.
  base: './',
  plugins: [react()],
  build: {
    // Keep flags as separate files so only the ones on screen are downloaded.
    assetsInlineLimit: (file) => (file.endsWith('.svg') ? false : undefined),
  },
})
