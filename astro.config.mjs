// @ts-check
import { defineConfig } from 'astro/config';
import sitemap, { ChangeFreqEnum } from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Canonical origin — used by sitemap, RSS and canonical URLs (Phase 6).
  site: 'https://virtualddd.com',
  // Match WordPress's trailing-slash URLs so existing links don't 301 (Phase 1).
  trailingSlash: 'always',
  integrations: [
    sitemap({
      // The three heuristic type indexes are filtered views of /heuristics/;
      // listing them invites duplicate-content warnings.
      filter: (page) =>
        !/\/heuristics\/(design|guiding|value-based)-heuristics\/$/.test(page),
      serialize(item) {
        // Sessions and stories are the pages worth recrawling often.
        if (/\/(sessions|facilitating-archdes)\/[^/]+\/$/.test(item.url)) {
          item.changefreq = ChangeFreqEnum.MONTHLY;
          item.priority = 0.8;
        } else if (/virtualddd\.com\/$/.test(item.url)) {
          item.changefreq = ChangeFreqEnum.WEEKLY;
          item.priority = 1.0;
        }
        return item;
      },
    }),
  ],
});
