/** A calendar file per session.
 *
 * These are live events people RSVP to, and "add to calendar" was missing from
 * both the old site and the rebuild. One .ics per session, linked from the page
 * while the session is still upcoming.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import type { APIContext } from 'astro';
import { guestsById, resolveRefs } from '../../../lib/collections';

export async function getStaticPaths() {
  const sessions = await getCollection('sessions');
  const guests = await guestsById();
  return sessions.map((session) => ({
    params: { slug: session.id },
    props: { session, guests: resolveRefs(session.data.guests, guests).map((g) => g.data.name) },
  }));
}

/** iCalendar wants UTC basic format: 20260805T080000Z */
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Long values must be folded at 75 octets, and , ; \ escaped. */
function line(name: string, value: string): string {
  const escaped = value.replace(/\\/g, '\\\\').replace(/[;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, '\\n');
  const full = `${name}:${escaped}`;
  const out = [full.slice(0, 74)];
  for (let i = 74; i < full.length; i += 73) out.push(' ' + full.slice(i, i + 73));
  return out.join('\r\n');
}

export function GET({ props, params, site }: APIContext) {
  const { session, guests } = props as { session: CollectionEntry<'sessions'>; guests: string[] };
  const d = session.data;
  const url = new URL(`/sessions/${params.slug}/`, site ?? 'https://virtualddd.com').toString();
  const start = new Date(d.datetime);
  // Sessions run about 90 minutes; nothing in Notion records the end time.
  const end = new Date(start.getTime() + 90 * 60 * 1000);

  const description = [
    d.seoMetadescription ?? '',
    guests.length ? `With ${guests.join(', ')}.` : '',
    d.organiser ? `Hosted by ${d.organiser}.` : '',
    `Details: ${url}`,
    d.humantix ? `RSVP: ${d.humantix}` : '',
  ].filter(Boolean).join('\n');

  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Virtual DDD//Sessions//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    line('UID', `${params.slug}@virtualddd.com`),
    line('DTSTAMP', stamp(new Date(d.wordpressPublishedDate ?? d.datetime))),
    line('DTSTART', stamp(start)),
    line('DTEND', stamp(end)),
    line('SUMMARY', d.title),
    line('DESCRIPTION', description),
    line('URL', url),
    line('LOCATION', d.meet ?? 'Online'),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return new Response(body + '\r\n', {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${params.slug}.ics"`,
    },
  });
}
