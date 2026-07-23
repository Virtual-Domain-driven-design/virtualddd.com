// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Canonical origin — used by sitemap, RSS and canonical URLs (Phase 6).
  site: 'https://virtualddd.com',
  // Match WordPress's trailing-slash URLs so existing links don't 301 (Phase 1).
  trailingSlash: 'always',
});
