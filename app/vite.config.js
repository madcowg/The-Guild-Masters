import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// GitHub Pages serves this project as one committed index.html with no
// separate build step, so the production build must stay a single
// self-contained file — see CLAUDE.md for why (past duplicate-React bug
// from bundling App.jsx via an absolute path outside this project).
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  server: {
    port: 5199,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
  },
});
