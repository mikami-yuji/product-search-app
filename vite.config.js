import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(() => {
  return {
    plugins: [
      react()
    ],
    base: './',
    resolve: {
      alias: [
        { find: /^lucide-react$/, replacement: path.resolve('src/icons.js') }
      ]
    },
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      minify: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('exceljs')) return 'vendor-exceljs';
              if (id.includes('xlsx')) return 'vendor-xlsx';
              if (id.includes('lucide-react')) return 'vendor-lucide';
              if (id.includes('react')) return 'vendor-react';
              return 'vendor';
            }
          }
        }
      }
    }
  }
})
