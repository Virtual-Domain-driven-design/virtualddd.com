/** The markdown behind an open space. See src/lib/markdown-page.ts. */
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { markdownResponse } from '../../../lib/markdown-page';

export async function getStaticPaths() {
  const items = await getCollection('openSpaces');
  return items.map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
}

export function GET(context: APIContext) {
  const { entry } = context.props as { entry: any };
  const d = entry.data;
  return markdownResponse(context, {
    title: d.title,
    path: `/open-space/${entry.id}/`,
    date: d.date,
    tags: d.tags,
    body: entry.body ?? '',
    extra: { type: 'Open Space', video: d.video },
  });
}
