/** The markdown behind a republished ddd-crew tool.
 *
 * The licence and the upstream canonical are in the front matter, not just the
 * page: anything reading the markdown instead of the HTML must still be told
 * this is CC BY-SA 4.0 and where the original lives. */
import type { APIContext } from 'astro';
import { markdownPaths, markdownFor } from '../../../lib/markdown-page';

export const getStaticPaths = () => markdownPaths('dddCrew');

export const GET = (context: APIContext) =>
  markdownFor(context, (entry) => ({
    title: entry.data.title,
    path: `/ddd-crew/${entry.id}/`,
    body: entry.body ?? '',
    extra: {
      type: 'ddd-crew tool',
      license: 'CC BY-SA 4.0',
      canonical: entry.data.canonical,
      repository: entry.data.repo,
      credit: 'The ddd-crew and its contributors',
    },
  }));
