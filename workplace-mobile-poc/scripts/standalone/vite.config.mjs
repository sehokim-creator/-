import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/*
 * Builds the app into one IIFE bundle plus one CSS file, which
 * build-standalone.mjs then inlines into a single .html.
 *
 * Two settings here are not cosmetic:
 *
 *  - formats: ["iife"]. An ES module bundle has to be loaded with
 *    <script type="module">, and module scripts are blocked by the file://
 *    origin rules in WebKit. A classic script is the only form that runs when
 *    the file is opened by double-clicking it.
 *
 *  - define for process.env. React's development/production branch reads
 *    process.env.NODE_ENV, which does not exist in a browser. In library mode
 *    Vite leaves it alone, so without this the bundle throws
 *    "process is not defined" before rendering anything.
 */
export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env": "{}",
  },
  build: {
    outDir: fileURLToPath(new URL("../../.standalone", import.meta.url)),
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: fileURLToPath(new URL("./entry.tsx", import.meta.url)),
      name: "WorkplacePoc",
      formats: ["iife"],
      fileName: () => "bundle.js",
    },
  },
});
