/** SEO and structured data, generated from properties we already hold.
 *
 * JSON-LD is never hand-authored in Notion — it is derived from the date, the
 * authors, the video URL and everything else the sync already writes.
 * Everything here takes an absolute site URL, because OG tags and JSON-LD must
 * not use relative paths.
 */
import type { CollectionEntry } from 'astro:content';

export const SITE_NAME = 'Virtual DDD';
export const SITE_TAGLINE = 'A community for Domain-Driven Design, software architecture and design';
export const TWITTER = '@virtualddd';

/** Absolute URL for a site-relative path. */
export const abs = (site: URL | undefined, path: string) =>
  new URL(path, site ?? 'https://virtualddd.com').toString();

/** The `<title>` for a piece of content.
 *
 * **No brand suffix on detail pages.** Search results truncate around 60
 * characters and "— Virtual DDD" costs 15 of them; appending it pushed 82 of
 * 108 sessions, 21 of 24 stories and 75 of 154 heuristics past the cut, so the
 * end of the actual topic was the part being thrown away. The domain already
 * appears in the result, so the brand is not lost.
 *
 * Indexes and landing pages keep it (`brand: true`): they are short, and there
 * the brand is doing real work — "Heuristics" alone says nothing.
 */
export const pageTitle = (text: string, { brand = false } = {}) =>
  brand ? `${text} — ${SITE_NAME}` : text;

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

/** The sections a page can sit under, named once.
 *
 * The label is what the breadcrumb says, and it should match the navigation:
 * a crumb that calls a section something the site does not is worse than no
 * crumb at all. */
export const SECTIONS = {
  sessions: ['Online sessions', '/sessions/'],
  stories: ['Facilitating Stories', '/facilitating-archdes/'],
  heuristics: ['Heuristics', '/heuristics/'],
  openSpace: ['Open Space', '/open-space/'],
  dddCrew: ['ddd-crew tools', '/ddd-crew/'],
  organisers: ['Organisers', '/organisers/'],
} as const satisfies Record<string, readonly [string, string]>;

/** Home → section → this page, the trail every detail page has. */
export const trail = (
  section: keyof typeof SECTIONS,
  name: string,
  path: string,
): [string, string][] => [['Home', '/'], [...SECTIONS[section]] as [string, string], [name, path]];

/** Home → this page, for a section index or a standalone page. */
export const topTrail = (name: string, path: string): [string, string][] =>
  [['Home', '/'], [name, path]];

/** A person: the host of a session, a guest, an organiser.
 *
 * `sameAs` is the point of it — it is how a search or answer engine works out
 * that the Nick Tune on this page is the one with that LinkedIn profile, which
 * is why the guests database holds the links at all (see
 * docs/content-model.md). Most
 * guests still have nothing but a name, and a Person with only a name is still
 * worth emitting: it names the speaker of the event. */
export interface PersonInput {
  name: string;
  /** How they would introduce themselves — `jobTitle`. */
  role?: string;
  /** A sentence or two — `description`. */
  bio?: string;
  /** Their own site, if any. */
  url?: string;
  /** Every profile we hold for them, from `profileLinks`. */
  sameAs?: string[];
  image?: string;
  /** Their page on this site, when they have one. */
  page?: string;
  /** `@id` of the Organization they belong to, for organisers. */
  memberOf?: string;
}

export const person = (p: PersonInput) => ({
  '@type': 'Person',
  ...(p.page ? { '@id': `${p.page}#person` } : {}),
  name: p.name,
  ...(p.role ? { jobTitle: p.role } : {}),
  ...(p.bio ? { description: p.bio } : {}),
  ...(p.url ? { url: p.url } : {}),
  ...(p.sameAs?.length ? { sameAs: p.sameAs } : {}),
  ...(p.image ? { image: p.image } : {}),
  ...(p.memberOf ? { memberOf: { '@id': p.memberOf } } : {}),
  ...(p.page ? { mainEntityOfPage: p.page } : {}),
});

/** Wrap one or more graph nodes as a JSON-LD document. */
export const graph = (...nodes: unknown[]) => ({
  '@context': 'https://schema.org',
  '@graph': nodes.filter(Boolean),
});

/** A page that is not one of the content types: About, Podcasts, a policy.
 *
 * Small, but it means "no structured data at all" is never the answer for a
 * page on this site — a crawler always gets a name, a description and where
 * the page sits. */
export const pageJsonLd = (
  site: URL | undefined,
  opts: { url: string; name: string; description: string; trail: [string, string][] },
) =>
  graph(
    organization(site),
    {
      '@type': 'WebPage',
      '@id': opts.url,
      name: opts.name,
      description: opts.description,
      isPartOf: { '@id': abs(site, '/#website') },
      inLanguage: 'en-GB',
      url: opts.url,
    },
    breadcrumbs(site, opts.trail),
  );

/** An index: a CollectionPage whose ItemList is what it lists.
 *
 * The list is the point — an index without one says "this page exists" and
 * nothing about the 108 things on it. Items are given in the order the page
 * renders them, so position means what a reader sees. */
export const collectionPage = (
  site: URL | undefined,
  opts: {
    url: string;
    name: string;
    description: string;
    items: { name: string; url: string }[];
    trail: [string, string][];
  },
) =>
  graph(
    organization(site),
    {
      '@type': 'CollectionPage',
      '@id': opts.url,
      name: opts.name,
      description: opts.description,
      isPartOf: { '@id': abs(site, '/#website') },
      inLanguage: 'en-GB',
      url: opts.url,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: opts.items.length,
        itemListElement: opts.items.map((it, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: it.name,
          url: it.url,
        })),
      },
    },
    breadcrumbs(site, opts.trail),
  );

/** A session: an Event, plus a VideoObject when the recording exists.
 *
 * Sessions are online events, so `eventAttendanceMode` is Online and the
 * location is a VirtualLocation — without those, Google treats an Event as
 * incomplete. Past sessions stay Events; that is what they were. */
export function sessionJsonLd(
  site: URL | undefined,
  session: CollectionEntry<'sessions'>,
  opts: {
    url: string; image?: string; isUpcoming: boolean;
    performers?: PersonInput[];
    /** Home → section → this page. */
    trail: [string, string][];
  },
) {
  const d = session.data;
  const org = organization(site);
  // Who was on the session: the guests who spoke, and the organiser hosting
  // them. The caller passes these enriched — roles, portraits and the profile
  // links that make `sameAs` worth having — because it has already resolved
  // the guest relation for the page. Without them we still know the names.
  const performers = opts.performers ?? [
    ...(d.organiser ? [{ name: d.organiser }] : []),
    ...d.coOrganisers.map((name) => ({ name })),
  ];
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
    ...(performers.length ? { performer: performers.map(person) } : {}),
    ...(d.humanitix && opts.isUpcoming
      ? { offers: { '@type': 'Offer', url: d.humanitix, price: '0', priceCurrency: 'EUR', availability: 'https://schema.org/InStock' } }
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

  return graph(org, event, video, breadcrumbs(site, opts.trail));
}

/** The heuristics collection, as one entity the individual terms belong to.
 *
 * A stable `@id` so every heuristic page can say `inDefinedTermSet` and mean
 * the same set, and the index page can describe it. */
export const heuristicSet = (site: URL | undefined) => ({
  '@type': 'DefinedTermSet',
  '@id': abs(site, '/heuristics/#set'),
  name: 'Virtual DDD heuristics',
  description:
    'A curated, growing collection of heuristics for systems and software design — rules of thumb that help you decide what to do next.',
  url: abs(site, '/heuristics/'),
  publisher: { '@id': abs(site, '/#organization') },
  inLanguage: 'en-GB',
});

/** A heuristic: a `DefinedTerm`, and the page that explains it.
 *
 * Two nodes, because they are two things. The heuristic itself is a named rule
 * of thumb — a term in a set — and that is what another system would want to
 * cite; the page is a `WebPage` about it, and that is what carries the authors,
 * the tags and the links out. Modelling the page alone would have made 154 of
 * the most quotable things on the site look like unlabelled prose.
 *
 * `subjectOf` on the term is how a session or story that discussed it is
 * attached: those *are* works about this thing. The heuristic-to-heuristic
 * graph is `relatedLink` on the page, which is where a link between pages
 * belongs. */
export function heuristicJsonLd(
  site: URL | undefined,
  heuristic: CollectionEntry<'heuristics'>,
  opts: {
    url: string;
    description: string;
    image?: string;
    /** Absolute URLs of the heuristics this one relates to. */
    related: string[];
    /** The sessions and stories that discussed it. */
    discussedIn: { name: string; url: string }[];
    /** Home → section → this page. */
    trail: [string, string][];
  },
) {
  const d = heuristic.data;
  const org = organization(site);
  const set = heuristicSet(site);
  const termId = `${opts.url}#heuristic`;

  const term = {
    '@type': 'DefinedTerm',
    '@id': termId,
    name: d.title,
    description: opts.description,
    inDefinedTermSet: { '@id': set['@id'] },
    ...(opts.image ? { image: [opts.image] } : {}),
    ...(opts.discussedIn.length
      ? { subjectOf: opts.discussedIn.map((w) => ({ '@type': 'CreativeWork', name: w.name, url: w.url })) }
      : {}),
    url: opts.url,
  };

  const page = {
    '@type': 'WebPage',
    '@id': opts.url,
    name: d.title,
    description: opts.description,
    // The question the heuristic answers — the page's own summary of itself.
    ...(d.question ? { abstract: d.question } : {}),
    mainEntity: { '@id': termId },
    ...(d.authors.length ? { author: d.authors.map((name) => person({ name })) } : {}),
    ...(d.tags.length ? { keywords: d.tags.join(', ') } : {}),
    ...(opts.related.length ? { relatedLink: opts.related } : {}),
    isPartOf: { '@id': abs(site, '/#website') },
    publisher: { '@id': org['@id'] },
    inLanguage: 'en-GB',
    url: opts.url,
  };

  return graph(org, set, term, page, breadcrumbs(site, opts.trail));
}

/** An open space: an Event, like a session but participant-led.
 *
 * Deliberately not routed through `sessionJsonLd`: an open space has no
 * organiser, no RSVP and a `date` rather than a `datetime`, and forcing the
 * two together would mean a helper full of "if this is really a session". What
 * they share is the shape of an online Event, which is small enough to say
 * twice. */
export function openSpaceJsonLd(
  site: URL | undefined,
  entry: CollectionEntry<'openSpaces'>,
  opts: { url: string; description: string; image?: string; trail: [string, string][] },
) {
  const d = entry.data;
  const org = organization(site);
  return graph(
    org,
    {
      '@type': 'Event',
      '@id': `${opts.url}#event`,
      name: d.title,
      startDate: new Date(d.date).toISOString(),
      eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
      eventStatus: 'https://schema.org/EventScheduled',
      location: { '@type': 'VirtualLocation', url: d.meetup ?? d.video ?? opts.url },
      organizer: { '@id': org['@id'] },
      description: opts.description,
      ...(opts.image ? { image: [opts.image] } : {}),
      ...(d.tickets ? { offers: { '@type': 'Offer', url: d.tickets, price: '0', priceCurrency: 'EUR', availability: 'https://schema.org/InStock' } } : {}),
      url: opts.url,
    },
    d.video
      ? {
          '@type': 'VideoObject',
          name: d.title,
          description: opts.description,
          uploadDate: new Date(d.date).toISOString(),
          embedUrl: d.video,
          ...(opts.image ? { thumbnailUrl: [opts.image] } : {}),
        }
      : null,
    breadcrumbs(site, opts.trail),
  );
}

/** A ddd-crew tool: someone else's CreativeWork, republished here.
 *
 * The licence and the attribution are the whole point (CC BY-SA 4.0), so they
 * are in the data and not only in the layout: `license`, `isBasedOn` the repo,
 * `contributor` for the people who wrote it, and `sameAs` the upstream
 * publication that `rel=canonical` already points at. Nothing here claims we
 * authored it. */
export function dddCrewJsonLd(
  site: URL | undefined,
  entry: CollectionEntry<'dddCrew'>,
  opts: { url: string; image?: string; trail: [string, string][] },
) {
  const d = entry.data;
  const org = organization(site);
  return graph(
    org,
    {
      '@type': 'CreativeWork',
      '@id': `${opts.url}#work`,
      name: d.title,
      ...(d.description ? { description: d.description } : {}),
      license: 'https://creativecommons.org/licenses/by-sa/4.0/',
      creditText: 'The ddd-crew and its contributors',
      isBasedOn: d.repo,
      sameAs: [d.repo, d.canonical],
      ...(d.contributors.length
        ? { contributor: d.contributors.map((c) => person({ name: c.name, url: c.url })) }
        : {}),
      ...(d.category ? { genre: d.category } : {}),
      ...(opts.image ? { image: [opts.image] } : {}),
      // The canonical version is upstream; this page republishes it.
      mainEntityOfPage: d.canonical,
      publisher: { '@id': org['@id'] },
      inLanguage: 'en',
      url: opts.url,
    },
    breadcrumbs(site, opts.trail),
  );
}

/**
 * A story: an Article with the people on it.
 *
 * The guest is the `author` — it is their story, and the episode exists to
 * tell it. The hosts ask the questions, which is `contributor`, not
 * authorship. Nothing stands in when neither is given: `Authors` was retired
 * from Notion on 2026-07-29, and a story with nobody on it fails
 * `tests/content/quality.test.mjs` rather than shipping uncredited.
 */
export function storyJsonLd(
  site: URL | undefined,
  story: CollectionEntry<'stories'>,
  opts: {
    url: string; image?: string; trail: [string, string][];
    authors?: PersonInput[]; contributors?: PersonInput[];
  },
) {
  const d = story.data;
  const org = organization(site);
  const authors = (opts.authors ?? []).map(person);
  return graph(org, breadcrumbs(site, opts.trail), {
    '@type': 'Article',
    '@id': `${opts.url}#article`,
    headline: d.title,
    ...(d.seoMetadescription ? { description: d.seoMetadescription } : {}),
    ...(d.publishedDate ? { datePublished: new Date(d.publishedDate).toISOString() } : {}),
    author: authors,
    ...(opts.contributors?.length ? { contributor: opts.contributors.map(person) } : {}),
    publisher: { '@id': org['@id'] },
    ...(opts.image ? { image: [opts.image] } : {}),
    mainEntityOfPage: opts.url,
    url: opts.url,
  });
}
