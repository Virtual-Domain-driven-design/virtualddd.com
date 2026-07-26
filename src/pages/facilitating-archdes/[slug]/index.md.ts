/** The markdown behind a Facilitating Story. See src/lib/markdown-page.ts. */
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { markdownResponse } from '../../../lib/markdown-page';

export async function getStaticPaths() {
  const stories = await getCollection('stories');
  return stories.map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
}

export function GET(context: APIContext) {
  const { entry } = context.props as { entry: any };
  const d = entry.data;
  return markdownResponse(context, {
    title: d.title,
    path: `/facilitating-archdes/${entry.id}/`,
    date: d.publishedDate,
    authors: d.authors,
    tags: d.tags,
    body: entry.body ?? '',
    extra: {
      type: 'Facilitating Story',
      episode: d.episode != null ? String(d.episode) : undefined,
      youtube: d.youtube,
    },
  });
}
