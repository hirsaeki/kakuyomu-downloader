import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { yamlPatternTransformerPlugin } from './src/lib/text-processing/config/yaml-pattern-transformer-plugin';

export default defineConfig({
  plugins: [
    react(),
    yamlPatternTransformerPlugin()
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          vendor: ['jszip', 'dexie', 'dompurify']
        }
      }
    }
  }
});
