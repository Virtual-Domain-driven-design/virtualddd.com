/** The markdown behind a page, served next to it.
 *
 * Every page here is generated from markdown that we hold anyway, so
 * `/sessions/<slug>/index.md` costs a file and no authoring. It is the cheapest
 * thing we can do for an agent reading the site: no HTML to strip, no nav, no
 * cards — the words, and a short header saying what they are and where the
 * canonical page is.
 *
 * The header is YAML front matter because that is what a markdown reader
 * expects, and because it lets the metadata be skipped by anything that only
 * wants prose.
 */
import type { APIContext } from 'astro';

export interface MarkdownPage {
  title: string;
  /** Site-relative path of the HTML page this belongs to. */
  path: string;
  body: string;
  date?: Date;
  authors?: string[];
  tags?: string[];
  /** Anything else worth stating, e.g. the licence on a republished tool. */
  extra?: Record<string, string | undefined>;
}

const yaml = (v: string) => `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
const list = (v: string[]) => `[${v.map(yaml).join(', ')}]`;

/** A `text/markdown` response: front matter, then the body. */
export function markdownResponse(context: APIContext, page: MarkdownPage): Response {
  const url = new URL(page.path, context.site ?? 'https://virtualddd.com').toString();
  const lines = [
    '---',
    `title: ${yaml(page.title)}`,
    `source: ${yaml(url)}`,
    ...(page.date ? [`date: ${page.date.toISOString().slice(0, 10)}`] : []),
    ...(page.authors?.length ? [`authors: ${list(page.authors)}`] : []),
    ...(page.tags?.length ? [`tags: ${list(page.tags)}`] : []),
    ...Object.entries(page.extra ?? {})
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${yaml(v as string)}`),
    '---',
    '',
    `# ${page.title}`,
    '',
    page.body.trim(),
    '',
  ];
  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
