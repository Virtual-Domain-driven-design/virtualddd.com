/** The markdown behind a heuristic. See src/lib/markdown-page.ts.
 *
 * Only the heuristics themselves: the three type indexes share this route's
 * `[slug]` namespace on the HTML side, but they are generated pages with no
 * markdown of their own. */
import type { APIContext } from 'astro';
import { markdownPaths, markdownFor } from '../../../lib/markdown-page';

export const getStaticPaths = () => markdownPaths('heuristics');

export const GET = (context: APIContext) =>
  markdownFor(context, (entry) => ({
    title: entry.data.title,
    path: `/heuristics/${entry.id}/`,
    authors: entry.data.authors,
    tags: entry.data.tags,
    body: entry.body ?? '',
    extra: {
      type: entry.data.type?.[0] ? entry.data.type[0].replace(/-/g, ' ') : 'heuristic',
      question: entry.data.question,
      submitter: entry.data.submitter,
    },
  }));
