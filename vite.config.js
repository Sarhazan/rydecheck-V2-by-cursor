import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    strictPort: false // אם הפורט תפוס, Vite יבחר אוטומטית פורט פנוי
  }
})
