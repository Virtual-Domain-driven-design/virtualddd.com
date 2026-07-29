/** The markdown behind a Facilitating Story. See src/lib/markdown-page.ts. */
import type { APIContext } from 'astro';
import { markdownPaths, markdownFor } from '../../../lib/markdown-page';
import { creditsFor, guestsById } from '../../../lib/collections';

export const getStaticPaths = () => markdownPaths('stories');

export const GET = async (context: APIContext) => {
  const guestIndex = await guestsById();
  return markdownFor(context, (entry) => ({
    title: entry.data.title,
    path: `/facilitating-archdes/${entry.id}/`,
    date: entry.data.publishedDate,
    authors: creditsFor(entry.data, guestIndex),
    tags: entry.data.tags,
    body: entry.body ?? '',
    extra: {
      type: 'Facilitating Story',
      episode: entry.data.episode != null ? String(entry.data.episode) : undefined,
      youtube: entry.data.youtube,
    },
  }));
};
