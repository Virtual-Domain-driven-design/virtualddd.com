/** Notion → markdown conversion, with no network and no filesystem.
 *
 * This is the part of the sync that decides what the website actually says, so
 * it lives apart from the API client that feeds it and is covered by
 * `tests/unit/notion-md.test.mjs`. Everything here is either pure or takes its
 * side effects as injected functions.
 *
 * `scripts/sync-notion.ts` owns the Notion client, the rate limiting, the image
 * downloads and the file writing; it imports the rules from here.
 */

/** A file name from a person's name.
 *
 * Accents are folded rather than dropped, because dropping them mangles the
 * name: Gáspár Nagy became `g-sp-r-nagy` and Emilio Carrión `emilio-carri-n`.
 * No existing organiser slug changes — they are all ASCII — and a guest has no
 * URL at all, so this is safe to have fixed after the fact. */
export function kebab(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function plainTitle(page: any, prop: string): string {
  const p = page.properties?.[prop];
  return (p?.title ?? []).map((t: any) => t.plain_text).join('').trim();
}

export type StatusKind = 'select' | 'status';

/** The Status value, from whichever of Notion's two status types the database
 * uses. The four databases are not consistent about this; see
 * docs/content-model.md. */
export function statusOf(page: any, kind: StatusKind, prop = 'Status'): string {
  const p = page.properties?.[prop];
  return (kind === 'select' ? p?.select?.name : p?.status?.name) ?? '';
}

export function yamlStr(s: string): string {
  return '"' + (s ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

export function yamlList(items: string[]): string {
  return '[' + items.map(yamlStr).join(', ') + ']';
}

export function fileUrl(f: any): string {
  return f?.type === 'external' ? f.external?.url : f?.file?.url ?? '';
}

/** Notion rich text → markdown, carrying annotations and links. */
export function richText(rts: any[] = []): string {
  return rts.map((rt) => {
    let t = rt.plain_text ?? '';
    const a = rt.annotations ?? {};
    if (a.code) t = '`' + t + '`';
    if (a.bold) t = `**${t}**`;
    if (a.italic) t = `*${t}*`;
    if (a.strikethrough) t = `~~${t}~~`;
    let href = rt.href ?? rt.text?.link?.url;
    // A Notion mention links to a bare page id ("/e342ff0d…"), which is not a
    // URL on this site. Where the visible text is itself a URL, use that;
    // otherwise keep the text and drop the dead link.
    if (href && /^\/?[0-9a-f]{32}$/.test(href.replace(/^\//, ''))) {
      href = /^https?:\/\//.test(t) ? t : undefined;
    }
    if (href) t = `[${t}](${href})`;
    return t;
  }).join('');
}

export interface AssetCtx { dir: string; slug: string; count: number }

/** Every `_assets/…` file an entry refers to.
 *
 * Reads the written entry rather than the run's own bookkeeping, because a
 * sync is incremental: most entries are not re-rendered, and their pictures
 * are just as referenced as the ones that were. Matches the frontmatter form
 * (`featuredImage: "./_assets/x.jpg"`), the markdown form (`![](./_assets/…)`)
 * and JSON (`"photo": "./_assets/…"`). Percent-escapes are decoded, since a
 * file whose name has a space is written escaped and stored unescaped. */
export function assetRefs(entry: string): string[] {
  return [...entry.matchAll(/_assets\/([^)"'\s]+)/g)]
    .map((m) => { try { return decodeURIComponent(m[1]); } catch { return m[1]; } });
}

/** Is this file the asset a previous sync stored for `slug` and `label`?
 *
 * Assets are written as `<slug>-<label>.<ext>` — `photo`, `featured`,
 * `body-1`. The rule lives here, and the directory read stays in the script,
 * because what makes it subtle is names shadowing each other: `body-1` must
 * not answer for `body-11`, and a slug that is the prefix of another slug must
 * not lend it its picture. Only the extension may follow the label. */
export function isAssetFor(file: string, slug: string, label: string): boolean {
  const stem = `${slug}-${label}.`;
  return file.startsWith(stem) && /^[a-z0-9]+$/i.test(file.slice(stem.length));
}

export interface MdDeps {
  /** Fetch a block's children. The script supplies the paged API call. */
  childrenOf: (blockId: string) => Promise<any[]>;
  /** Store an image and return the path to reference, or null to drop it. */
  downloadImage: (url: string, ctx: AssetCtx, label: string) => Promise<string | null>;
}

/** Build a `blocksToMd` bound to the given side effects.
 *
 * Returns the converter plus `seenUnhandled`, the set of Notion block types the
 * run met and had no rule for — reported at the end of a sync so a new block
 * type in Notion surfaces as a message rather than as a silent gap in a page.
 */
export function createBlocksToMd(deps: MdDeps) {
  const seenUnhandled = new Set<string>();

  /** How far this document's headings must move so its shallowest becomes an
   *  h2, sitting under the page title's h1.
   *
   * Demoting everything by one — the old rule — was right only for a body that
   * starts with a Notion heading_1. Most do not: an author who opens with
   * heading_2 produced a page whose first heading was an h3, which tells a
   * screen reader about a level that is not there. 160 heuristics shipped that
   * way. Shifting by the distance to h2 handles every case, and leaves a body
   * that already starts at heading_1 exactly as it was. */
  const NOTION_HEADING = { heading_1: 1, heading_2: 2, heading_3: 3 } as const;
  const headingShift = (blocks: any[]) => {
    const levels = blocks
      .map((b) => NOTION_HEADING[b.type as keyof typeof NOTION_HEADING])
      .filter((n) => n !== undefined) as number[];
    return levels.length ? 2 - Math.min(...levels) : 0;
  };

  /** Render a list of blocks to markdown. `indent` handles nested lists.
   *  `shift` is computed once for the document and passed down. */
  async function blocksToMd(blocks: any[], ctx: AssetCtx | null, indent = '', shift?: number): Promise<string> {
    const out: string[] = [];
    const move = shift ?? headingShift(blocks);
    const heading = (level: number, rt: any[]) =>
      `${'#'.repeat(Math.min(6, Math.max(2, level + move)))} ${richText(rt)}`;
    let numIdx = 0;
    for (const b of blocks) {
      const t = b.type;
      if (t !== 'numbered_list_item') numIdx = 0;
      const data = b[t];
      const kids = b.has_children ? await deps.childrenOf(b.id) : [];
      const nestable = ['paragraph', 'bulleted_list_item', 'numbered_list_item', 'to_do', 'callout', 'toggle'].includes(t);
      const nested = kids.length && nestable ? '\n' + (await blocksToMd(kids, ctx, indent + '  ', move)) : '';

      switch (t) {
        case 'paragraph':
          out.push(indent + richText(data.rich_text) + nested); break;
        // Never an h1: the page title is the only one. See `headingShift`.
        case 'heading_1': out.push(heading(1, data.rich_text)); break;
        case 'heading_2': out.push(heading(2, data.rich_text)); break;
        case 'heading_3': out.push(heading(3, data.rich_text)); break;
        case 'bulleted_list_item': out.push(`${indent}- ${richText(data.rich_text)}${nested}`); break;
        case 'numbered_list_item': out.push(`${indent}${++numIdx}. ${richText(data.rich_text)}${nested}`); break;
        case 'to_do': out.push(`${indent}- [${data.checked ? 'x' : ' '}] ${richText(data.rich_text)}${nested}`); break;
        case 'quote': out.push(`> ${richText(data.rich_text)}`); break;
        case 'callout': {
          const icon = data.icon?.emoji ? data.icon.emoji + ' ' : '';
          out.push(`> ${icon}${richText(data.rich_text)}${nested ? '\n' + nested : ''}`); break;
        }
        case 'code':
          out.push('```' + (data.language ?? '') + '\n' + richText(data.rich_text) + '\n```'); break;
        case 'divider': out.push('---'); break;
        case 'image': {
          const url = fileUrl(data); const cap = richText(data.caption);
          let rel: string | null = url;
          if (url && ctx) rel = await deps.downloadImage(url, ctx, `body-${++ctx.count}`);
          out.push(rel ? `![${cap}](${rel})` : ''); break;
        }
        case 'video': case 'embed': case 'bookmark': case 'link_preview': {
          const url = data.url ?? fileUrl(data);
          // Preserve the URL as an autolink; a later pass can upgrade YouTube to an iframe component.
          out.push(url ? `[${url}](${url})` : ''); break;
        }
        case 'toggle':
          out.push(`<details><summary>${richText(data.rich_text)}</summary>\n\n${nested}\n</details>`); break;
        case 'table': {
          const rows = kids.filter((k) => k.type === 'table_row');
          if (!rows.length) break;
          const toRow = (r: any) => '| ' + r.table_row.cells.map((c: any) => richText(c).replace(/\|/g, '\\|').replace(/\n/g, ' ')).join(' | ') + ' |';
          const md = [toRow(rows[0])];
          md.push('| ' + Array(rows[0].table_row.cells.length).fill('---').join(' | ') + ' |');
          rows.slice(1).forEach((r) => md.push(toRow(r)));
          out.push(md.join('\n')); break;
        }
        case 'table_row': break; // handled by its parent table
        case 'child_page': break; // skip nested pages
        default:
          seenUnhandled.add(t);
          out.push(`<!-- TODO block: ${t} -->`);
      }
    }
    return out.filter((s) => s !== undefined).join('\n\n');
  }

  return { blocksToMd, seenUnhandled };
}

/** How a relation to a heuristic resolves.
 *
 * Three outcomes, and keeping them apart is the point: a heuristic that is
 * still being curated is normal editorial work in progress, while a relation
 * pointing at a page that is not in the database at all is a real dangling
 * reference. Only the second should fail a build.
 */
export type RelationOutcome =
  | { kind: 'resolved'; slug: string }
  | { kind: 'pending'; title: string; status: string }
  | { kind: 'dangling' };

export function resolveRelation(
  id: string,
  published: Map<string, string>,
  unpublished: Map<string, { title: string; status: string }>,
): RelationOutcome {
  const slug = published.get(id);
  if (slug) return { kind: 'resolved', slug };
  const p = unpublished.get(id);
  if (p) return { kind: 'pending', title: p.title, status: p.status };
  return { kind: 'dangling' };
}
