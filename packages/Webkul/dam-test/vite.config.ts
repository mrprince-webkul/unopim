import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts: true,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // The three.js hero chunk is intentionally large and lazy-loaded.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Split large, stable vendors into their own long-cacheable chunks so
        // the app entry stays small. three.js is already isolated via the lazy
        // HeroCanvas import, so it is intentionally not listed here.
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          query: ["@tanstack/react-query"],
          motion: ["framer-motion"],
        },
      },
    },
  },
}));