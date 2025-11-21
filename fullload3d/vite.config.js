import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
      external: (id) => {
        // Prevent bundling of native modules
        return id.includes('@rollup/rollup') || id.includes('fsevents')
      }
    },
    commonjsOptions: {
      transformMixedEsModules: true
    },
    target: 'esnext',
    minify: 'esbuild'
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    }
  }
})
