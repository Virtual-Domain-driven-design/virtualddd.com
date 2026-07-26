/** SEO and structured data, generated from properties we already hold.
 *
 * MIGRATION.md Phase 6: JSON-LD is never hand-authored in Notion — it is
 * derived from the date, authors, video URL and so on that the sync already
 * writes. Everything here takes an absolute site URL because OG tags and
 * JSON-LD must not use relative paths.
 */
import type { CollectionEntry } from 'astro:content';
import { getImage } from 'astro:assets';

export const SITE_NAME = 'Virtual DDD';
export const SITE_TAGLINE = 'A community for Domain-Driven Design, software architecture and design';
export const TWITTER = '@virtualddd';

/** Absolute URL for a site-relative path. */
export const abs = (site: URL | undefined, path: string) =>
  new URL(path, site ?? 'https://virtualddd.com').toString();

/** The social card for an image: one 1200px JPEG, used by both the OG tags and
 *  the JSON-LD so they agree and only one derivative is emitted.
 *
 *  Never reference the original asset here: `.src` points at the unoptimised
 *  source file, which would then have to ship (≈18 MB across the site) purely
 *  to satisfy a meta tag. JPEG rather than WebP because social scrapers still
 *  handle WebP inconsistently. */
export async function socialCard(site: URL | undefined, image: ImageMetadata) {
  // Sharp cannot rasterise SVG here, and social scrapers will not render one
  // anyway — those pages fall back to the site card.
  if (image.format === 'svg') return abs(site, image.src);
  const card = await getImage({ src: image, width: 1200, format: 'jpeg', quality: 80 });
  return abs(site, card.src);
}

/** The organisation, referenced by @id from the other graphs. */
export const organization = (site: URL | undefined) => ({
  '@type': 'Organization',
  '@id': abs(site, '/#organization'),
  name: SITE_NAME,
  url: abs(site, '/'),
  description: SITE_TAGLINE,
  sameAs: [
    'https://discord.gg/tRJkcsFDKN',
    'https://www.linkedin.com/company/virtual-domain-driven-design/',
    'https://bsky.app/profile/virtualddd.com',
    'https://techhub.social/@virtualddd',
    'https://www.meetup.com/Virtual-Domain-Driven-Design-meetup/',
  ],
});

/** Breadcrumbs for a nested page. `trail` is [label, path] pairs, page last. */
export const breadcrumbs = (site: URL | undefined, trail: [string, string][]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: trail.map(([name, path], i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name,
    item: abs(site, path),
  })),
});

/** Wrap one or more graph nodes as a JSON-LD document. */
export const graph = (...nodes: unknown[]) => ({
  '@context': 'https://schema.org',
  '@graph': nodes.filter(Boolean),
});

/** A session: an Event, plus a VideoObject when the recording exists.
 *
 * Sessions are online events, so `eventAttendanceMode` is Online and the
 * location is a VirtualLocation — without those, Google treats an Event as
 * incomplete. Past sessions stay Events; that is what they were. */
export function sessionJsonLd(
  site: URL | undefined,
  session: CollectionEntry<'sessions'>,
  opts: { url: string; image?: string; isUpcoming: boolean },
) {
  const d = session.data;
  const org = organization(site);
  const event: Record<string, unknown> = {
    '@type': 'Event',
    '@id': `${opts.url}#event`,
    name: d.title,
    startDate: new Date(d.datetime).toISOString(),
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: {
      '@type': 'VirtualLocation',
      url: d.meet ?? d.video ?? opts.url,
    },
    organizer: { '@id': org['@id'] },
    ...(opts.image ? { image: [opts.image] } : {}),
    ...(d.seoMetadescription ? { description: d.seoMetadescription } : {}),
    ...(d.organiser ? { performer: { '@type': 'Person', name: d.organiser } } : {}),
    ...(d.humantix && opts.isUpcoming
      ? { offers: { '@type': 'Offer', url: d.humantix, price: '0', priceCurrency: 'EUR', availability: 'https://schema.org/InStock' } }
      : {}),
    url: opts.url,
  };

  const video = d.video
    ? {
        '@type': 'VideoObject',
        name: d.title,
        description: d.seoMetadescription ?? d.title,
        uploadDate: new Date(d.datetime).toISOString(),
        embedUrl: d.video,
        ...(opts.image ? { thumbnailUrl: [opts.image] } : {}),
      }
    : null;

  return graph(org, event, video);
}

/** A story: an Article with its authors. */
export function storyJsonLd(
  site: URL | undefined,
  story: CollectionEntry<'stories'>,
  opts: { url: string; image?: string },
) {
  const d = story.data;
  const org = organization(site);
  return graph(org, {
    '@type': 'Article',
    '@id': `${opts.url}#article`,
    headline: d.title,
    ...(d.seoMetadescription ? { description: d.seoMetadescription } : {}),
    ...(d.publishedDate ? { datePublished: new Date(d.publishedDate).toISOString() } : {}),
    author: d.authors.map((name) => ({ '@type': 'Person', name })),
    publisher: { '@id': org['@id'] },
    ...(opts.image ? { image: [opts.image] } : {}),
    mainEntityOfPage: opts.url,
    url: opts.url,
  });
}
