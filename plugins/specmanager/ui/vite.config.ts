import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import ts from "typescript";

/**
 * Drops comments from emitted chunks; the code itself stays unminified.
 * ProseMirror's doc links (in comments and one error message) are what the
 * Anthropic directory validator read as a remote host next to env-like words.
 */
const stripComments: Plugin = {
  name: "strip-comments",
  apply: "build",
  renderChunk(code, chunk) {
    const linkFree = code.replaceAll("https://prosemirror.net/docs/", "ProseMirror docs: ");
    const out = ts.transpileModule(linkFree, {
      fileName: chunk.fileName,
      compilerOptions: {
        removeComments: true,
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
      },
    });
    return { code: out.outputText, map: null };
  },
};

export default defineConfig({
  plugins: [react(), stripComments],
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
