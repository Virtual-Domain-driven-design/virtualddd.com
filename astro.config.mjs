// @ts-check
import { defineConfig } from 'astro/config';
import sitemap, { ChangeFreqEnum } from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Canonical origin — used by the sitemap, the feed and every canonical URL.
  site: 'https://virtualddd.com',
  // Every URL ends in a slash, so existing links never 301. A test enforces it.
  trailingSlash: 'always',
  integrations: [
    sitemap({
      // The three heuristic type indexes are filtered views of /heuristics/;
      // listing them invites duplicate-content warnings. /410/ is the body of
      // an error response, not a page anyone should be sent to from search.
      filter: (page) =>
        !/\/heuristics\/(design|guiding|value-based)-heuristics\/$/.test(page) &&
        !/\/410\/$/.test(page),
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
