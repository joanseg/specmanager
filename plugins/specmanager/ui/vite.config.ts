import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:4317",
      "/ws": { target: "ws://127.0.0.1:4317", ws: true },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      output: {
        manualChunks: (id) =>
          id.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/)?.[1]?.replace("@", "").replace("/", "-"),
      },
    },
  },
});
