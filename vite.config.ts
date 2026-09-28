/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  base: './',
  server: {
    host: true,
    port: 8080,
    hmr: {
      clientPort: 8080,
    },
  },
  build: {
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        entryFileNames: '[name]-[hash].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name]-[hash].[ext]',
      },
    },
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
}));
