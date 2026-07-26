/** The markdown behind a session page. See src/lib/markdown-page.ts. */
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { markdownResponse } from '../../../lib/markdown-page';
import { guestsById, resolveRefs } from '../../../lib/collections';

export async function getStaticPaths() {
  const sessions = await getCollection('sessions');
  const guests = await guestsById();
  return sessions.map((entry) => ({
    params: { slug: entry.id },
    props: { entry, guests: resolveRefs(entry.data.guests, guests).map((g) => g.data.name) },
  }));
}

export function GET(context: APIContext) {
  const { entry, guests } = context.props as { entry: any; guests: string[] };
  const d = entry.data;
  return markdownResponse(context, {
    title: d.title,
    path: `/sessions/${entry.id}/`,
    date: d.datetime,
    tags: d.tags,
    body: entry.body ?? '',
    extra: {
      type: 'Online session',
      host: d.organiser,
      guests: guests.length ? guests.join(', ') : undefined,
      video: d.video,
    },
  });
}
