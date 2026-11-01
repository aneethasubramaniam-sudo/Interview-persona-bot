import { defineConfig } from "vite";

export default defineConfig({
  // Relative paths so the build works from any subpath (GitHub Pages) or root.
  base: "./",
  server: { host: true },
});
