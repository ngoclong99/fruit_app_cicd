import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Alias '@' -> src để import gọn (vd '@/api/axios' thay vì '../../api/axios')
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    host: "0.0.0.0",
    proxy: {
      // Local dev: forward /api den backend container/local server
      "/api": {
        target: process.env.VITE_DEV_API_TARGET || "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "esbuild",
  },
});
