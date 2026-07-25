import { defineCollection, reference } from 'astro:content';
import { z } from 'astro:schema';
import { glob } from 'astro/loaders';

// Content is GENERATED from Notion by scripts/sync-notion.ts and written to
// src/content/<collection>/<slug>.md — never hand-edited. The markdown file
// name is the slug, and therefore the URL. These schemas mirror the verified
// Notion data-source schemas; see CLAUDE.md for the source-of-truth mapping.
//
// Draft decisions worth your review (flagged, not final):
//  - People (Sessions Organiser/Co-Organisers, Stories/Heuristics Authors) are
//    modelled as plain name strings for now, not a `reference()`, because there
//    is no `people`/`speakers` collection yet. Revisit if speaker pages happen.
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
      // Used to match/verify the preserved WordPress URL.
      wordpressPublishedDate: z.coerce.date().optional(),
      typeOfSession: z.enum(['talk', 'debate', 'panel-discussion', 'fireside-chat', 'hands-on']).optional(),
      level: z.array(z.enum(['Advanced', 'Intermediate', 'Beginner'])).default([]),
      tags: z.array(z.string()).default([]),
      featuredImage: image().optional(),
      video: z.string().url().optional(),
      podcastPlayer: z.string().url().optional(),
      miro: z.string().url().optional(),
      meet: z.string().url().optional(),
      humantix: z.string().url().optional(),
      organiser: z.string().optional(),
      coOrganisers: z.array(z.string()).default([]),
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
      video: z.string().url().optional(),
      podcast: z.string().url().optional(),
      meetup: z.string().url().optional(),
      miro: z.string().url().optional(),
      tickets: z.string().url().optional(),
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
      youtube: z.string().url().optional(),
      podcast: z.string().url().optional(),
      curatedHeuristics: z.array(reference('heuristics')).default([]),
      focusKeyphrase: z.string().optional(),
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
      focusKeyphrase: z.string().optional(),
      metaDescription: z.string().optional(),
    }),
});

// Organisers: structured data (no body), generated from the Virtual DDD
// Organisers Notion DB. Public team info was migrated out of WordPress.
const organisers = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/organisers' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      slug: z.string(),
      role: z.string().optional(),
      website: z.string().url().optional(),
      linkedin: z.string().url().optional(),
      area: z.string().optional(),
      organises: z.array(z.string()).default([]),
      showOnTeam: z.boolean().default(false),
      photo: image().optional(),
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
      repo: z.string().url(),
      canonical: z.string().url(),
      license: z.string().default('CC-BY-SA-4.0'),
      category: z.string(),
      order: z.number().default(0),
      stars: z.number().optional(),
      contributors: z.array(z.object({ name: z.string(), url: z.string().url() })).default([]),
      heroImage: image().optional(),
    }),
});

export const collections = { sessions, openSpaces, stories, heuristics, organisers, dddCrew };
