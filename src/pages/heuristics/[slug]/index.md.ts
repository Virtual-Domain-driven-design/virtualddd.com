/** The markdown behind a heuristic. See src/lib/markdown-page.ts.
 *
 * Only the heuristics themselves: the three type indexes share this route's
 * `[slug]` namespace on the HTML side, but they are generated pages with no
 * markdown of their own. */
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { markdownResponse } from '../../../lib/markdown-page';

export async function getStaticPaths() {
  const heuristics = await getCollection('heuristics');
  return heuristics.map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
}

export function GET(context: APIContext) {
  const { entry } = context.props as { entry: any };
  const d = entry.data;
  return markdownResponse(context, {
    title: d.title,
    path: `/heuristics/${entry.id}/`,
    authors: d.authors,
    tags: d.tags,
    body: entry.body ?? '',
    extra: {
      type: d.type?.[0] ? d.type[0].replace(/-/g, ' ') : 'heuristic',
      question: d.question,
      submitter: d.submitter,
    },
  });
}
