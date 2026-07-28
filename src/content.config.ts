import { defineCollection, reference } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

// Content is GENERATED from Notion by scripts/sync-notion.ts and written to
// src/content/<collection>/<slug>.md — never hand-edited. The markdown file
// name is the slug, and therefore the URL. These schemas mirror the verified
// Notion data-source schemas; see CLAUDE.md for the source-of-truth mapping.
//
// Draft decisions worth your review (flagged, not final):
//  - Organisers and authors (Sessions Organiser/Co-Organisers,
//    Stories/Heuristics Authors) are still plain name strings; only Sessions
//    `Guests` is a `reference()`, because that is the one people table with
//    per-person links to put in `sameAs`.
//  - `curatedHeuristics` uses reference('heuristics') so a dangling link fails
//    the build instead of vanishing silently.
//  - Featured images are downloaded locally by the sync; image() validates and
//    optimises them at build time.

const seo = {
  // Optional editorial overrides; the layout falls back to title / first
  // paragraph / featured image when these are empty.
  seoTitle: z.string().optional(),
  seoMetadescription: z.string().optional(),
};

const sessions = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/sessions' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      status: z.enum(['Ideas', 'Drafting', 'Planned', 'GoLive', 'Published', 'Ended', 'Done']),
      // Drives the upcoming (future) vs past (elapsed) split, client-side.
      datetime: z.coerce.date(),
      typeOfSession: z.enum(['talk', 'debate', 'panel-discussion', 'fireside-chat', 'hands-on']).optional(),
      level: z.array(z.enum(['Advanced', 'Intermediate', 'Beginner'])).default([]),
      tags: z.array(z.string()).default([]),
      featuredImage: image().optional(),
      video: z.url().optional(),
      podcastPlayer: z.url().optional(),
      miro: z.url().optional(),
      meet: z.url().optional(),
      humantix: z.url().optional(),
      organiser: z.string().optional(),
      coOrganisers: z.array(z.string()).default([]),
      // Speakers and panellists. A relation, unlike the organiser strings
      // above, because these carry links that become `sameAs`.
      guests: z.array(reference('sessionGuests')).default([]),
      curatedHeuristics: z.array(reference('heuristics')).default([]),
      ...seo,
    }),
});

const openSpaces = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/open-spaces' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      status: z.enum(['Drafting', 'Published', 'Done']),
      date: z.coerce.date(),
      tags: z.array(z.string()).default([]),
      featuredImage: image().optional(),
      video: z.url().optional(),
      podcast: z.url().optional(),
      meetup: z.url().optional(),
      miro: z.url().optional(),
      tickets: z.url().optional(),
      ...seo,
    }),
});

const stories = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/stories' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      status: z.enum(['Ideas', 'Planning', 'Planned', 'Recorded', 'Drafting', 'Published']),
      episode: z.number().optional(),
      publishedDate: z.coerce.date().optional(),
      authors: z.array(z.string()).default([]),
      tags: z.array(z.string()).default([]),
      featuredImage: image().optional(),
      featuredImageSquared: image().optional(),
      youtube: z.url().optional(),
      podcast: z.url().optional(),
      curatedHeuristics: z.array(reference('heuristics')).default([]),
      ...seo,
    }),
});

const heuristics = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/heuristics' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      status: z.enum(['Submitted', 'Research', 'Curating', 'SEO Enrich', 'Published']),
      question: z.string().optional(),
      type: z.array(z.enum(['Not sure', 'value-based-heuristics', 'guiding-heuristics', 'design-heuristics'])).default([]),
      authors: z.array(z.string()).default([]),
      submitter: z.string().optional(),
      tags: z.array(z.string()).default([]),
      featuredImage: image().optional(),
      // The heuristics graph: five self-relations plus links to sessions/stories.
      competesWith: z.array(reference('heuristics')).default([]),
      complements: z.array(reference('heuristics')).default([]),
      enables: z.array(reference('heuristics')).default([]),
      prerequisites: z.array(reference('heuristics')).default([]),
      specializes: z.array(reference('heuristics')).default([]),
      metaDescription: z.string().optional(),
      seoTitle: z.string().optional(),
    }),
});

// Organisers: structured data (no body), generated from the Virtual DDD
// Organisers Notion database. Drives /organisers/.
const organisers = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/organisers' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      slug: z.string(),
      role: z.string().optional(),
      website: z.url().optional(),
      linkedin: z.url().optional(),
      area: z.string().optional(),
      organises: z.array(z.string()).default([]),
      showOnTeam: z.boolean().default(false),
      photo: image().optional(),
    }),
});

// Session guests: the speakers and panellists a session had, kept apart from
// the organisers (who run the community) on purpose — see CLAUDE.md. Structured
// data only, generated by scripts/sync-notion.ts; the links become `sameAs` on
// the Person node in a session's JSON-LD.
//
// Guests have **no slug and no page of their own**. The entry id comes from
// the name, and exists only so a session's `guests` relation can resolve; what
// a person does belongs in their bio, not in a field beside it.
const sessionGuests = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/session-guests' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      bio: z.string().optional(),
      website: z.url().optional(),
      linkedin: z.url().optional(),
      mastodon: z.url().optional(),
      bluesky: z.url().optional(),
      // Ticked when this person also has a row in the organisers database, so
      // the deliberate duplicate is findable.
      alsoAnOrganiser: z.boolean().default(false),
      photo: image().optional(),
    }),
});

// Conferences: the DDD conferences and camps listed on the home page. Structured
// data only, generated from the Virtual DDD Conferences Notion database.
//
// Not a content type: there is no page, no slug and no URL of ours. A card is
// the whole of it, and it links straight out to the conference. So this is the
// organisers shape (a row, a picture, some fields), not the sessions shape.
const conferences = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/conferences' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      // A whole-day range. `end` is optional so a one-day camp needs no second
      // date, and the card says "21 Sep 2026" rather than "21–21 Sep 2026".
      start: z.coerce.date(),
      end: z.coerce.date().optional(),
      location: z.string().optional(),
      description: z.string().optional(),
      website: z.url().optional(),
      logo: image().optional(),
      // Every logo is somebody else's, and they do not agree: three of the four
      // are dark type on transparent, DDD Europe's is light type on its own
      // navy. One plate colour per row is what lets them all sit in one row
      // without a code change when the fifth one arrives.
      logoBackground: z.string().optional(),
    }),
});

// ddd-crew: community tools republished from the ddd-crew GitHub repos (CC BY-SA 4.0).
// Generated by scripts/sync-ddd-crew.ts — never hand-edited. Attribution + canonical
// to the upstream repo are mandatory and live in the layout.
const dddCrew = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/ddd-crew' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().optional(),
      repo: z.url(),
      canonical: z.url(),
      license: z.string().default('CC-BY-SA-4.0'),
      category: z.string(),
      order: z.number().default(0),
      stars: z.number().optional(),
      contributors: z.array(z.object({ name: z.string(), url: z.url() })).default([]),
      heroImage: image().optional(),
    }),
});

export const collections = { sessions, openSpaces, stories, heuristics, organisers, sessionGuests, conferences, dddCrew };
