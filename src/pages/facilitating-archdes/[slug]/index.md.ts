/** The markdown behind a Facilitating Story. See src/lib/markdown-page.ts. */
import type { APIContext } from 'astro';
import { markdownPaths, markdownFor } from '../../../lib/markdown-page';

export const getStaticPaths = () => markdownPaths('stories');

export const GET = (context: APIContext) =>
  markdownFor(context, (entry) => ({
    title: entry.data.title,
    path: `/facilitating-archdes/${entry.id}/`,
    date: entry.data.publishedDate,
    authors: entry.data.authors,
    tags: entry.data.tags,
    body: entry.body ?? '',
    extra: {
      type: 'Facilitating Story',
      episode: entry.data.episode != null ? String(entry.data.episode) : undefined,
      youtube: entry.data.youtube,
    },
  }));
