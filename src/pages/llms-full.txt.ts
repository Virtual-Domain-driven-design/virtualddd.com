/** llms-full.txt — the whole corpus in one file.
 *
 * `llms.txt` is a table of contents; this is the text. It exists so a model
 * that cannot crawl 300 pages can still read the community's actual writing in
 * one request, and because we hold all of it as markdown anyway.
 *
 * **ddd-crew is deliberately not here.** Those pages are republished under
 * CC BY-SA 4.0 with `rel=canonical` pointing upstream: we host them, we do not
 * speak for them, and folding 180 KB of someone else's corpus into a file that
 * reads as *our* content would be the wrong thing to do with a share-alike
 * licence. They are listed in `llms.txt` and each has its own `.md` carrying
 * the licence and the attribution.
 */
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { shortDate } from '../lib/dates';
import { SITE_NAME, SITE_TAGLINE } from '../lib/seo';
import { creditsFor, guestsById, resolveRefs } from '../lib/collections';

export async function GET(context: APIContext) {
  const base = (context.site ?? new URL('https://virtualddd.com')).toString().replace(/\/$/, '');

  const sessions = (await getCollection('sessions')).sort(
    (a, b) => +new Date(b.data.datetime) - +new Date(a.data.datetime),
  );
  const stories = (await getCollection('stories')).sort((a, b) => (b.data.episode ?? 0) - (a.data.episode ?? 0));
  const heuristics = (await getCollection('heuristics')).sort((a, b) => a.data.title.localeCompare(b.data.title));
  const openSpaces = (await getCollection('openSpaces')).sort(
    (a, b) => +new Date(b.data.date) - +new Date(a.data.date),
  );
  const guests = await guestsById();

  const out: string[] = [
    `# ${SITE_NAME} — full text`,
    '',
    `> ${SITE_TAGLINE}. Volunteer-run, online, free to attend.`,
    '> Every session, story, heuristic and open space below, in full.',
    `> The index is at ${base}/llms.txt, and each page is also available on its own`,
    '> as markdown: append `index.md` to any content URL.',
    '>',
    '> Community-authored, and free to quote with attribution to Virtual DDD and',
    '> the named author. The ddd-crew tools are not included here: they are',
    '> republished under their own licences and their canonical version lives upstream.',
    '',
  ];

  /** One entry: a heading that is a link, the metadata line, then the body. */
  const entry = (path: string, title: string, meta: string[], body: string) => {
    out.push(`## ${title}`, '', `Source: ${base}${path}`);
    if (meta.length) out.push(...meta);
    out.push('', (body ?? '').trim(), '');
  };

  out.push('---', '', '# Online sessions', '');
  for (const s of sessions) {
    const names = resolveRefs(s.data.guests, guests).map((g) => g.data.name);
    entry(`/sessions/${s.id}/`, s.data.title, [
      `Date: ${shortDate(s.data.datetime)}`,
      ...(s.data.organiser ? [`Host: ${s.data.organiser}`] : []),
      ...(names.length ? [`Guests: ${names.join(', ')}`] : []),
      ...(s.data.tags.length ? [`Tags: ${s.data.tags.join(', ')}`] : []),
    ], s.body ?? '');
  }

  out.push('---', '', '# Facilitating Stories', '');
  for (const s of stories) {
    const credited = creditsFor(s.data, guests);
    entry(`/facilitating-archdes/${s.id}/`, s.data.title, [
      ...(s.data.episode != null ? [`Episode: ${s.data.episode}`] : []),
      ...(s.data.publishedDate ? [`Date: ${shortDate(s.data.publishedDate)}`] : []),
      ...(credited.length ? [`Told by: ${credited.join(', ')}`] : []),
    ], s.body ?? '');
  }

  out.push('---', '', '# Heuristics', '');
  for (const h of heuristics) {
    entry(`/heuristics/${h.id}/`, h.data.title, [
      ...(h.data.question ? [`Question: ${h.data.question}`] : []),
      ...(h.data.type[0] ? [`Type: ${h.data.type[0].replace(/-/g, ' ')}`] : []),
      ...(h.data.authors.length ? [`Authors: ${h.data.authors.join(', ')}`] : []),
    ], h.body ?? '');
  }

  out.push('---', '', '# Open Space', '');
  for (const s of openSpaces) {
    entry(`/open-space/${s.id}/`, s.data.title, [`Date: ${shortDate(s.data.date)}`], s.body ?? '');
  }

  return new Response(out.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
