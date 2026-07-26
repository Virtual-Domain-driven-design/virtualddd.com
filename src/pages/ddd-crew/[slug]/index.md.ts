/** The markdown behind a republished ddd-crew tool.
 *
 * The licence and the upstream canonical are in the front matter, not just the
 * page: anything reading the markdown instead of the HTML must still be told
 * this is CC BY-SA 4.0 and where the original lives. */
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { markdownResponse } from '../../../lib/markdown-page';

export async function getStaticPaths() {
  const items = await getCollection('dddCrew');
  return items.map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
}

export function GET(context: APIContext) {
  const { entry } = context.props as { entry: any };
  const d = entry.data;
  return markdownResponse(context, {
    title: d.title,
    path: `/ddd-crew/${entry.id}/`,
    body: entry.body ?? '',
    extra: {
      type: 'ddd-crew tool',
      license: 'CC BY-SA 4.0',
      canonical: d.canonical,
      repository: d.repo,
      credit: 'The ddd-crew and its contributors',
    },
  });
}
