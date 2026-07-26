/** llms.txt — a plain-text index of the site for language models.
 *
 * Nearly free, because every page here is already generated from clean
 * markdown: this is a table of contents over content we hold, not a new
 * artefact to maintain. See MIGRATION.md Phase 6.
 */
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { shortDate } from '../lib/dates';
import { SITE_NAME, SITE_TAGLINE } from '../lib/seo';
import { isUpcoming } from '../lib/collections';

export async function GET(context: APIContext) {
  const base = (context.site ?? new URL('https://virtualddd.com')).toString().replace(/\/$/, '');
  const link = (path: string, title: string, note?: string) =>
    `- [${title}](${base}${path})${note ? `: ${note}` : ''}`;

  const sessions = (await getCollection('sessions')).sort(
    (a, b) => +new Date(b.data.datetime) - +new Date(a.data.datetime),
  );
  const stories = (await getCollection('stories')).sort((a, b) => (b.data.episode ?? 0) - (a.data.episode ?? 0));
  const heuristics = (await getCollection('heuristics')).sort((a, b) => a.data.title.localeCompare(b.data.title));
  const openSpaces = (await getCollection('openSpaces'));
  const crew = (await getCollection('dddCrew'));

  const upcoming = sessions.filter((s) => isUpcoming(s));

  const out = [
    `# ${SITE_NAME}`,
    '',
    `> ${SITE_TAGLINE}. Volunteer-run, online, free to attend. Sessions are recorded;`,
    '> most also exist as podcast episodes. Content is community-authored;',
    '> the ddd-crew section is republished under CC BY-SA 4.0.',
    '',
    '## Start here',
    '',
    link('/sessions/', 'Online sessions', `${sessions.length} live meetups, recorded`),
    link('/facilitating-archdes/', 'Facilitating Stories', `${stories.length} real-world stories on facilitating software architecture and design`),
    link('/heuristics/', 'Heuristics', `${heuristics.length} curated rules of thumb for systems and software design`),
    link('/open-space/', 'Open Space', `${openSpaces.length} participant-led unconferences`),
    link('/ddd-crew/', 'ddd-crew tools', `${crew.length} community canvases and guides (CC BY-SA 4.0)`),
    link('/podcasts/', 'Podcasts', 'every session and story as an episode'),
    link('/organisers/', 'Organisers', 'the volunteers who run it'),
    link('/about-us/', 'About us', 'how and why this community started'),
    '',
  ];

  if (upcoming.length) {
    out.push('## Upcoming', '');
    for (const s of upcoming) {
      out.push(link(`/sessions/${s.id}/`, s.data.title, `${shortDate(s.data.datetime)}${s.data.organiser ? `, hosted by ${s.data.organiser}` : ''}`));
    }
    out.push('');
  }

  out.push('## Sessions', '');
  for (const s of sessions) {
    out.push(link(`/sessions/${s.id}/`, s.data.title, shortDate(s.data.datetime)));
  }

  out.push('', '## Facilitating Stories', '');
  for (const s of stories) {
    const note = [s.data.episode != null ? `episode ${s.data.episode}` : null, s.data.authors.join(', ')]
      .filter(Boolean).join(' — ');
    out.push(link(`/facilitating-archdes/${s.id}/`, s.data.title, note || undefined));
  }

  out.push('', '## Heuristics', '');
  for (const h of heuristics) {
    out.push(link(`/heuristics/${h.id}/`, h.data.title, h.data.question ?? undefined));
  }

  out.push('', '## ddd-crew tools', '');
  for (const c of crew) {
    out.push(link(`/ddd-crew/${c.id}/`, c.data.title, c.data.description ?? undefined));
  }

  out.push('', '## Open Space', '');
  for (const o of openSpaces) {
    out.push(link(`/open-space/${o.id}/`, o.data.title, shortDate(o.data.date)));
  }
  out.push('');

  return new Response(out.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
