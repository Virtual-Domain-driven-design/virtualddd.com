/**
 * Fill in cover images, ISBNs and topics on the Notion Books database.
 *
 *   tsx scripts/enrich-books.ts            # dry run, prints what it would set
 *   tsx scripts/enrich-books.ts --write    # writes it
 *
 * Covers and ISBNs come from the Open Library search API: free, no key, and a
 * real source rather than a guessed URL. A cover is only set when the title
 * match is confident; anything doubtful is reported and left alone, because a
 * wrong cover on a recommendation is worse than no cover.
 *
 * Only ever fills EMPTY fields. A cover or topic set by a human is never
 * overwritten, so this is safe to re-run.
 */
import dotenv from 'dotenv';

dotenv.config({ path: 'local.env' });

const DS = '253adb92-df69-4664-838a-a28ea0798bf0'; // 📚 Books
const write = process.argv.includes('--write');

const token = process.env.NOTION_TOKEN;
if (!token) {
  console.error('NOTION_TOKEN missing (expected in local.env).');
  process.exit(1);
}

/**
 * Topics for the rows created before the Topics property existed. Keyed by
 * title so it is obvious what is being claimed about each book, and applied
 * only where Topics is still empty.
 */
const TOPICS: Record<string, string[]> = {
  'Domain-Driven Design Reference': ['DDD'],
  'Domain-Driven Design Quickly': ['DDD'],
  'Learning Domain-Driven Design': ['DDD'],
  'Domain-Driven Design Distilled': ['DDD'],
  'Domain-Driven Design': ['DDD'],
  'Implementing Domain-Driven Design': ['DDD'],
  'Patterns, Principles and Practices of Domain-Driven Design': ['DDD'],
  'Domain Modeling Made Functional': ['DDD', 'Architecture'],
  'Introducing EventStorming': ['Collaboration & facilitation', 'DDD'],
  'Team Topologies': ['Strategy & org design'],
  'Architecture Modernization': ['Architecture', 'Strategy & org design', 'DDD'],
  'Adaptive Systems with Domain-Driven Design, Wardley Mapping, and Team Topologies':
    ['Strategy & org design', 'Systems thinking', 'DDD'],
};

/**
 * The one-line recommendation for each book, restored after the property was
 * deleted and re-created. Applied only where it is still empty, so anything
 * rewritten by a human wins. This is the only text on a reading-list entry that
 * is ours, which is why it lives in version control rather than only in Notion.
 */
const WHY: Record<string, string> = {
  'Domain-Driven Design':
    'The blue book. Listed deliberately as a reference and NOT as a starting point: telling a newcomer to begin here is the most common way to lose them.',
  'Domain-Driven Design Reference':
    'The definitions, free, from the author. Better first contact with the vocabulary than the blue book, and short enough to actually finish.',
  'Domain-Driven Design Quickly':
    'Dated, and still a decent free overview for someone who wants prose rather than a talk. Say the date out loud when recommending it.',
  'Learning Domain-Driven Design':
    'The strongest current first book. Covers strategic and tactical without assuming you already believe in either.',
  'Domain-Driven Design Distilled':
    'Short and honest. The one to hand someone who has been told to do DDD by Thursday.',
  'Implementing Domain-Driven Design':
    'The practical companion to the blue book. Heavy, and worth it once you have a real system to apply it to.',
  'Patterns, Principles and Practices of Domain-Driven Design':
    'Broad and example-heavy. Useful as a reference to dip into rather than a book to read through.',
  'Domain Modeling Made Functional':
    'For the functional programming crowd, and we already have his talk in the archive, so the book and the video can be offered together.',
  'Introducing EventStorming':
    'The facilitation anchor, and the closest book to what this community is actually about. From the person who invented the technique.',
  'Domain Storytelling':
    'The gentler alternative to EventStorming for a first collaborative modelling session, especially with people who are sceptical of sticky notes.',
  'Collaborative Software Design':
    "How to facilitate domain modelling decisions, from three of this community's own organisers. The closest book in existence to what Virtual DDD is actually about, and the one to lead the facilitation track with.",
  'Facilitating Software Architecture':
    'Decentralising architectural decisions without losing coherence. Pairs directly with the advice decision record and the heuristics in our own archive.',
  'Communication Patterns':
    'The part of the job nobody teaches: diagrams, documentation and getting a technical point across. A design nobody understood is a design that did not happen.',
  'Learning Systems Thinking':
    'Why the hardest problems are in the relationships rather than the parts. Useful for someone who has learned the DDD patterns and still cannot make them land.',
  'Thinking in Systems':
    'The primer everything else on systems thinking assumes you have read. Short, and not about software at all.',
  'Residues: Time, Change, and Uncertainty in Software Architecture':
    'Residuality theory, from the person who developed it. Heavy going and genuinely original. We already have two of his talks in the video inventory, so book and talk can be offered together.',
  'Team Topologies':
    'Adjacent to DDD and hard to do strategic design without. Explains why a context boundary that ignores team boundaries does not survive.',
  'Architecture Modernization':
    'For the lead who arrived with a monolith and a mandate. Treats DDD as one tool in a modernisation effort rather than the point.',
  'Adaptive Systems with Domain-Driven Design, Wardley Mapping, and Team Topologies':
    'Where DDD meets strategy and org design. Read after you have run a modelling session, not before.',
  'Strategic Monoliths and Microservices':
    'Directly aimed at the reader who arrived asking whether to break up their monolith, and honest that the answer is often no.',
  'Software Architecture: The Hard Parts':
    'Trade-off analysis for decisions with no good option, which is most of the interesting ones. Where to go once bounded contexts meet data.',
  'Fundamentals of Software Architecture':
    'Broad grounding for someone who came to DDD without an architecture background and keeps hitting words they have not met.',
  'Building Evolutionary Architectures':
    'Fitness functions, and how to keep a boundary from eroding once you have drawn it. The missing half of most DDD advice.',
  'Wardley Maps':
    'Published free by the author, chapter by chapter. The mapping technique that Core Domain Charts borrow from, so it makes that ddd-crew tool make more sense.',
  Accelerate:
    'The evidence that loosely coupled architecture and autonomous teams actually pay off. Useful ammunition when introducing DDD upwards.',
  'Thinking, Fast and Slow':
    'The biases the ddd-crew debiasing toolkit is trying to counter. Read the toolkit first and this second, not the other way round.',
};

async function notion(path: string, method: 'GET' | 'POST' | 'PATCH', body?: unknown) {
  const res = await fetch(`https://api.notion.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2025-09-03',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) throw new Error(`${path} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

const plain = (rt: any[] = []) => rt.map((t: any) => t.plain_text ?? '').join('').trim();

/** Lowercase, drop punctuation and subtitle, so titles compare fairly. */
const norm = (s: string) =>
  s.toLowerCase().split(':')[0].replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

type Found = { cover?: string; isbn?: string; via: string; matched: string };

const surnamesOf = (authors: string) =>
  authors
    .split(/,| and /)
    .map((a) => a.trim().split(/\s+/).pop()?.toLowerCase())
    .filter((s): s is string => Boolean(s && s.length > 2));

const titleAgrees = (got: string, wanted: string) =>
  got === wanted || got.startsWith(wanted) || wanted.startsWith(got);

/**
 * Open Library first. Note the `title` and `author` parameters rather than a
 * combined `q`: the full-text search is poor here and answered "Domain-Driven
 * Design by Eric Evans" with one unrelated book, which is what made the whole
 * DDD canon look absent.
 */
async function fromOpenLibrary(title: string, authors: string): Promise<Found | null> {
  const q = new URLSearchParams({
    title,
    limit: '10',
    fields: 'title,author_name,cover_i,isbn',
    ...(authors ? { author: authors } : {}),
  });
  const res = await fetch(`https://openlibrary.org/search.json?${q}`, {
    headers: { 'User-Agent': 'virtualddd.com book enrichment (organisers@virtualddd.com)' },
  });
  if (!res.ok) return null;
  const data: any = await res.json();

  const wanted = norm(title);
  const surnames = surnamesOf(authors);
  const matches: Found[] = [];

  for (const doc of data.docs ?? []) {
    if (!titleAgrees(norm(doc.title ?? ''), wanted)) continue;
    if (surnames.length) {
      const names = (doc.author_name ?? []).join(' ').toLowerCase();
      if (!surnames.some((s) => names.includes(s))) continue;
    }
    matches.push({
      cover: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : undefined,
      isbn: (doc.isbn ?? []).find((i: string) => i.length === 13) ?? (doc.isbn ?? [])[0],
      via: 'Open Library',
      matched: doc.title,
    });
  }

  // The first correct hit is often an edition with no artwork, so prefer one
  // that has a cover before falling back to a bare title-and-ISBN match.
  return matches.find((m) => m.cover) ?? matches[0] ?? null;
}

/**
 * Google Books second, because Open Library has thin artwork for anything
 * published in the last few years: it knows Collaborative Software Design and
 * Facilitating Software Architecture exist but holds no cover for either.
 * No API key is needed for this query.
 */
async function fromGoogleBooks(title: string, authors: string): Promise<Found | null> {
  const first = authors.split(/,| and /)[0]?.trim();
  const q = `intitle:${JSON.stringify(title)}${first ? ` inauthor:${JSON.stringify(first)}` : ''}`;
  const key = process.env.GOOGLE_BOOKS_KEY;
  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?maxResults=10&q=${encodeURIComponent(q)}` +
    (key ? `&key=${key}` : '')
  );
  if (!res.ok) return null;
  const data: any = await res.json();

  const wanted = norm(title);
  const surnames = surnamesOf(authors);

  for (const item of data.items ?? []) {
    const v = item.volumeInfo ?? {};
    if (!titleAgrees(norm(v.title ?? ''), wanted)) continue;
    if (surnames.length) {
      const names = (v.authors ?? []).join(' ').toLowerCase();
      if (!surnames.some((s) => names.includes(s))) continue;
    }
    const thumb: string | undefined = v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail;
    if (!thumb) continue;

    return {
      // https, no page-curl overlay, and the larger of the two sizes Google serves.
      cover: thumb.replace(/^http:/, 'https:').replace(/&edge=curl/, '').replace(/zoom=\d/, 'zoom=1'),
      isbn: (v.industryIdentifiers ?? []).find((i: any) => i.type === 'ISBN_13')?.identifier,
      via: 'Google Books',
      matched: v.title,
    };
  }
  return null;
}

/**
 * A search result can lack `cover_i` while Open Library still holds artwork
 * filed under the ISBN. `?default=false` is the documented way to ask: it 404s
 * instead of returning the grey placeholder, so a 200 means a real cover.
 */
async function coverByIsbn(isbn: string): Promise<string | null> {
  const url = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok ? url : null;
  } catch {
    return null;
  }
}

async function lookup(title: string, authors: string): Promise<Found | null> {
  const ol = await fromOpenLibrary(title, authors);
  if (ol?.cover) return ol;

  if (ol?.isbn) {
    const byIsbn = await coverByIsbn(ol.isbn);
    if (byIsbn) return { ...ol, cover: byIsbn, via: 'Open Library (by ISBN)' };
  }

  // Google Books has much better artwork for anything published recently, but
  // its keyless quota is shared and global: it answered 429 for every request
  // on 2026-07-30. Kept as a best effort, and it simply returns null when
  // throttled, so this never becomes the reason a run fails. Set GOOGLE_BOOKS_KEY
  // in local.env to make it dependable.
  await new Promise((r) => setTimeout(r, 250));
  const gb = await fromGoogleBooks(title, authors);
  if (gb?.cover) return { ...gb, isbn: gb.isbn ?? ol?.isbn };

  return ol ?? gb;
}

async function main() {
  const books: any[] = [];
  let cursor: string | undefined;
  do {
    const page: any = await notion(`data_sources/${DS}/query`, 'POST', {
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    books.push(...page.results);
    cursor = page.has_more ? page.next_cursor : undefined;
  } while (cursor);

  console.log(`${books.length} books in Notion\n`);

  let covered = 0;
  let topiced = 0;
  let slugged = 0;
  let whyed = 0;
  const unmatched: string[] = [];

  // The sync requires a slug on every collection, and on a list page with no
  // route the slug is still the anchor: /reading-list/#collaborative-software-design
  // is a link people paste. Deriving it from the title once and storing it means
  // an edited title cannot silently break a shared link.
  const taken = new Set(
    books.map((b: any) => plain(b.properties?.Slug?.rich_text)).filter(Boolean)
  );
  const slugify = (s: string) => {
    const full = s
      .normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    // Only trim when it is actually too long, and then cut at a word boundary so
    // the slug never ends mid-word. Trimming unconditionally is what turned
    // "Domain Storytelling" into "domain".
    let base = full;
    if (base.length > 60) {
      base = base.slice(0, 60);
      const lastDash = base.lastIndexOf('-');
      if (lastDash > 20) base = base.slice(0, lastDash);
      base = base.replace(/-+$/, '');
    }

    if (!taken.has(base)) return base;
    for (let n = 2; ; n += 1) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
  };

  for (const b of books) {
    const p = b.properties ?? {};
    const title = plain(p.Title?.title);
    const authors = plain(p.Authors?.rich_text);
    const hasCover = (p.Cover?.files ?? []).length > 0;
    const hasTopics = (p.Topics?.multi_select ?? []).length > 0;

    const props: Record<string, unknown> = {};

    if (!hasCover) {
      const found = await lookup(title, authors);
      if (found?.isbn && !plain(p.ISBN?.rich_text)) {
        props.ISBN = { rich_text: [{ type: 'text', text: { content: found.isbn } }] };
      }
      if (found?.cover) {
        props.Cover = {
          files: [{
            type: 'external',
            name: `${title.slice(0, 90)} cover.jpg`,
            external: { url: found.cover },
          }],
        };
        covered += 1;
        console.log(`  cover  ${title}  ->  ${found.via} "${found.matched}"`);
      } else {
        unmatched.push(found?.isbn ? `${title} (ISBN found, no artwork)` : title);
      }
      // Open Library asks for a gentle pace and there is no hurry here.
      await new Promise((r) => setTimeout(r, 400));
    }

    if (!hasTopics && TOPICS[title]) {
      props.Topics = { multi_select: TOPICS[title].map((name) => ({ name })) };
      topiced += 1;
      console.log(`  topics ${title}  ->  ${TOPICS[title].join(', ')}`);
    }

    if (!plain(p['Why it is worth it']?.rich_text) && WHY[title]) {
      props['Why it is worth it'] = {
        rich_text: [{ type: 'text', text: { content: WHY[title] } }],
      };
      whyed += 1;
      console.log(`  why    ${title}`);
    }

    if (!plain(p.Slug?.rich_text) && title) {
      const slug = slugify(title);
      taken.add(slug);
      props.Slug = { rich_text: [{ type: 'text', text: { content: slug } }] };
      slugged += 1;
      console.log(`  slug   ${title}  ->  ${slug}`);
    }

    if (Object.keys(props).length && write) {
      await notion(`pages/${b.id}`, 'PATCH', { properties: props });
      await new Promise((r) => setTimeout(r, 350));
    }
  }

  console.log(`\n${covered} covers found, ${topiced} topic sets, ${slugged} slugs, ${whyed} notes restored`);
  if (unmatched.length) {
    console.log(`\nNo confident match, cover left empty (add by hand or fix the title):`);
    for (const t of unmatched) console.log(`  - ${t}`);
  }
  if (!write) console.log('\nDry run. Nothing was written. Re-run with --write.');
}

main().catch((e) => { console.error(e); process.exit(1); });
