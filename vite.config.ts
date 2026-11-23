import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const tunnelHost = loadEnv(mode, process.cwd(), '').VITE_TUNNEL_HOST?.trim()

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      // Optional public tunnel host (e.g. Cloudflare quick tunnel) for sharing the dev server.
      allowedHosts: tunnelHost ? [tunnelHost] : undefined,
      proxy: {
        '/api': 'http://localhost:4000',
        '/uploads': 'http://localhost:4000',
        '/robots.txt': 'http://localhost:4000',
        '/sitemap.xml': 'http://localhost:4000',
      },
    },
    build: {
      target: 'es2022',
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            motion: ['framer-motion'],
            gsap: ['gsap'],
          },
        },
      },
    },
  }
})
