import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Nama repo GitHub (harus sama persis dengan nama repo)
const REPO_NAME = 'angely-parfums-desain-formulir'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages: base = '/nama-repo/'
  // Vercel: base = '/' (Vercel otomatis mengisi env VERCEL saat build)
  base: process.env.VERCEL ? '/' : `/${REPO_NAME}/`,
})
