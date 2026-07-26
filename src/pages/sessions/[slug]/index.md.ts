/** The markdown behind a session page. See src/lib/markdown-page.ts. */
import type { APIContext } from 'astro';
import { markdownPaths, markdownFor } from '../../../lib/markdown-page';
import { guestsById, resolveRefs } from '../../../lib/collections';

export const getStaticPaths = () => markdownPaths('sessions');

export const GET = (context: APIContext) =>
  markdownFor(context, async (entry) => {
    const guests = resolveRefs(entry.data.guests, await guestsById()).map((g) => g.data.name);
    return {
      title: entry.data.title,
      path: `/sessions/${entry.id}/`,
      date: entry.data.datetime,
      tags: entry.data.tags,
      body: entry.body ?? '',
      extra: {
        type: 'Online session',
        host: entry.data.organiser,
        guests: guests.length ? guests.join(', ') : undefined,
        video: entry.data.video,
      },
    };
  });
