/** The markdown behind an open space. See src/lib/markdown-page.ts. */
import type { APIContext } from 'astro';
import { markdownPaths, markdownFor } from '../../../lib/markdown-page';

export const getStaticPaths = () => markdownPaths('openSpaces');

export const GET = (context: APIContext) =>
  markdownFor(context, (entry) => ({
    title: entry.data.title,
    path: `/open-space/${entry.id}/`,
    date: entry.data.date,
    tags: entry.data.tags,
    body: entry.body ?? '',
    extra: { type: 'Open Space', video: entry.data.video },
  }));
