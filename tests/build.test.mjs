/** Contract assertions over the built site — no browser, about a second.
 *
 * Everything here is a promise to somebody outside this repo: a search engine,
 * a feed reader, a person with a bookmark. Breaking one of these is invisible
 * locally and expensive months later, so these block the deploy.
 *
 * Content quality — anything an editor can break from Notion — is deliberately
 * *not* here; it lives in tests/content/ and reports without blocking. See
 * docs/testing.md.
 *
 * Run after `npm run build`.
 */
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pages, meta, attr, text, markup, countHook, published, DIST } from './helpers.mjs';
import { readFileSync as readEntry, readdirSync as readEntries } from 'node:fs';
// The site's own rule for when a session is over, imported rather than restated:
// see the comment in 'sessions in their two states'.
import { hasFinished } from '../src/lib/upcoming.ts';

let all;
before(() => {
  assert.ok(existsSync(DIST), 'dist/ missing — run `npm run build` first');
  all = pages();
  // A floor low enough that no editorial change can reach it: this catches a
  // build that produced almost nothing, and deliberately says nothing about
  // how big the site is.
  assert.ok(all.length > 50, `the build produced only ${all.length} pages`);
});

describe('every page', () => {
  test('has a non-empty <title>', () => {
    for (const p of all) {
      const title = attr(p.html, /<title>([^<]*)<\/title>/);
      assert.ok(title && title.trim(), `${p.path} has no <title>`);
    }
  });

  test('has an absolute canonical matching its own path', () => {
    for (const p of all) {
      const c = attr(p.html, /<link rel="canonical" href="([^"]*)"/);
      assert.ok(c, `${p.path} has no canonical`);
      assert.ok(c.startsWith('https://'), `${p.path} canonical is not absolute: ${c}`);
      // ddd-crew pages canonicalise upstream on purpose (CC BY-SA).
      if (!p.path.startsWith('/ddd-crew/') || p.path === '/ddd-crew/') {
        assert.equal(new URL(c).pathname, p.path, `${p.path} canonical points elsewhere: ${c}`);
      }
    }
  });

  test('has Open Graph and Twitter card tags', () => {
    for (const p of all) {
      for (const tag of ['og:title', 'og:type', 'og:url', 'og:image', 'og:site_name']) {
        assert.ok(meta(p.html, tag), `${p.path} missing ${tag}`);
      }
      assert.equal(meta(p.html, 'twitter:card'), 'summary_large_image', `${p.path} twitter:card`);
      assert.ok(meta(p.html, 'og:image').startsWith('https://'), `${p.path} og:image must be absolute`);
    }
  });

  test('has exactly one <h1>', () => {
    // Editors cannot break this from Notion any more — the sync demotes body
    // headings — so a failure here means the templates regressed.
    for (const p of all) {
      const n = (p.html.match(/<h1[\s>]/g) ?? []).length;
      assert.equal(n, 1, `${p.path} has ${n} h1 elements`);
    }
  });

  test('never renders undefined, NaN or [object Object]', () => {
    const bad = all
      .filter((p) => /\b(undefined|NaN|\[object Object\])\b/.test(p.html.replace(/<script[\s\S]*?<\/script>/g, '')))
      .map((p) => p.path);
    assert.deepEqual(bad, [], `placeholder values leaked into: ${bad.join(', ')}`);
  });
});

describe('internal links', () => {
  test('all resolve to a page that exists', () => {
    const paths = new Set(all.map((p) => p.path));
    const broken = new Set();
    for (const p of all) {
      for (const m of p.html.matchAll(/href="(\/[^"#?]*)"/g)) {
        const href = m[1];
        // Anything with a file extension is a file and must exist on disk;
        // anything without is a page and must be one we built. Listing the
        // extensions instead meant adding `.woff2` to a test to preload a font.
        if (/\.[a-z0-9]{2,5}$/i.test(href)) {
          if (!existsSync(`${DIST}${href}`)) broken.add(`${href} (from ${p.path})`);
          continue;
        }
        if (!paths.has(href)) broken.add(`${href} (from ${p.path})`);
      }
    }
    assert.deepEqual([...broken], [], `broken internal links:\n${[...broken].join('\n')}`);
  });

  test('all end in a trailing slash, matching trailingSlash: always', () => {
    const bad = new Set();
    for (const p of all) {
      for (const m of p.html.matchAll(/href="(\/[^"#?]*)"/g)) {
        const href = m[1];
        if (href === '/' || /\.[a-z0-9]{2,5}$/.test(href)) continue;
        if (!href.endsWith('/')) bad.add(`${href} (from ${p.path})`);
      }
    }
    assert.deepEqual([...bad], [], `links that would 301:\n${[...bad].join('\n')}`);
  });
});

describe('structured data', () => {
  test('every JSON-LD block parses and is typed', () => {
    for (const p of all) {
      for (const m of p.html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
        let data;
        assert.doesNotThrow(() => { data = JSON.parse(m[1]); }, `${p.path} has invalid JSON-LD`);
        assert.equal(data['@context'], 'https://schema.org', `${p.path} JSON-LD @context`);
        const nodes = data['@graph'] ?? [data];
        for (const node of nodes) assert.ok(node['@type'], `${p.path} JSON-LD node without @type`);
      }
    }
  });

  test('sessions are Events and stories are Articles', () => {
    // The shape, not the contents — whether a given session filled in its
    // fields is an editorial question (tests/content/).
    const sessions = all.filter((p) => /^\/sessions\/[^/]+\/$/.test(p.path));
    assert.equal(sessions.length, published('sessions'),
      'a published session did not get a page');
    for (const p of sessions) {
      const raw = attr(p.html, /application\/ld\+json[^>]*>([\s\S]*?)<\/script>/);
      const event = JSON.parse(raw)['@graph'].find((n) => n['@type'] === 'Event');
      assert.ok(event, `${p.path} has no Event`);
      assert.equal(event.eventAttendanceMode, 'https://schema.org/OnlineEventAttendanceMode');
    }
    for (const p of all.filter((x) => /^\/facilitating-archdes\/[^/]+\/$/.test(x.path))) {
      const raw = attr(p.html, /application\/ld\+json[^>]*>([\s\S]*?)<\/script>/);
      assert.ok(JSON.parse(raw)['@graph'].find((n) => n['@type'] === 'Article'), `${p.path} has no Article`);
    }
  });

  // A breadcrumb that names a section the site does not have, or ends
  // somewhere other than the page it is on, is worse than no breadcrumb: it is
  // what a search result shows instead of the URL.
  test('every page says where it sits', () => {
    const skip = (path) => path === '/' || path === '/410/';
    for (const p of all.filter((x) => !skip(x.path))) {
      const raw = attr(p.html, /application\/ld\+json[^>]*>([\s\S]*?)<\/script>/);
      assert.ok(raw, `${p.path} has no JSON-LD at all`);
      const crumbs = JSON.parse(raw)['@graph'].find((n) => n['@type'] === 'BreadcrumbList');
      assert.ok(crumbs, `${p.path} has no BreadcrumbList`);
      const items = crumbs.itemListElement;
      assert.equal(items[0].name, 'Home', `${p.path} breadcrumb does not start at Home`);
      assert.equal(new URL(items.at(-1).item).pathname, p.path,
        `${p.path} breadcrumb ends somewhere else`);
      items.forEach((it, i) => assert.equal(it.position, i + 1, `${p.path} breadcrumb positions`));
      // Every step must be a page that exists, not a section we renamed.
      for (const it of items) {
        assert.ok(all.some((x) => x.path === new URL(it.item).pathname),
          `${p.path} breadcrumb points at ${it.item}, which is not built`);
      }
    }
  });

  // Heuristics are the most quotable thing here — a named rule with an author
  // and a graph around it — so they are DefinedTerms in one set. The failure
  // this guards is a silent one: a term pointing at a set `@id` that no page
  // declares, or a link in the graph to a page that is no longer published.
  test('heuristics are DefinedTerms in the set the index declares', () => {
    const nodes = (p) => JSON.parse(attr(p.html, /application\/ld\+json[^>]*>([\s\S]*?)<\/script>/))['@graph'];
    const index = all.find((p) => p.path === '/heuristics/');
    const set = nodes(index).find((n) => n['@type'] === 'DefinedTermSet');
    assert.ok(set?.['@id'], '/heuristics/ declares no DefinedTermSet');

    const paths = new Set(all.map((p) => p.path));
    const terms = all.filter((p) => /^\/heuristics\/[^/]+\/$/.test(p.path))
      .map((p) => [p, nodes(p).find((n) => n['@type'] === 'DefinedTerm')])
      .filter(([, t]) => t); // the three type indexes carry the set, not a term
    assert.equal(terms.length, published('heuristics'),
      'a published heuristic is missing its DefinedTerm');

    for (const [p, term] of terms) {
      assert.ok(term.name, `${p.path} DefinedTerm has no name`);
      assert.equal(term.inDefinedTermSet?.['@id'], set['@id'],
        `${p.path} belongs to a set nothing declares`);
      const page = nodes(p).find((n) => n['@type'] === 'WebPage');
      assert.equal(page?.mainEntity?.['@id'], term['@id'],
        `${p.path} WebPage does not point at its own term`);
      // Every URL the graph hands out must be a page that exists.
      const links = [...(page?.relatedLink ?? []), ...(term.subjectOf ?? []).map((w) => w.url)];
      for (const href of links) {
        assert.ok(paths.has(new URL(href).pathname), `${p.path} JSON-LD links to ${href}, which is not built`);
      }
    }
  });

  // Who spoke is why the guests database exists: `sameAs` is how an answer
  // engine works out that this Nick Tune is that one. A guest credited on the
  // page but missing from the Event is the failure that would go unnoticed.
  //
  // The credit line is the check, not the Guests section: the section only
  // appears once someone has a bio, while the credit — and the structured
  // data — name every guest the session had.
  test('a session that credits guests names them as performers', () => {
    const sessions = all.filter((p) => /^\/sessions\/[^/]+\/$/.test(p.path));
    const withGuests = sessions.filter((p) => p.html.includes('data-test="guest-credit"'));
    // A wiring floor, not a content one: the guest relation reaching only a
    // handful of sessions means the sync stopped resolving it.
    assert.ok(withGuests.length > 5,
      `the guest relation reached only ${withGuests.length} sessions`);

    for (const p of withGuests) {
      const raw = attr(p.html, /application\/ld\+json[^>]*>([\s\S]*?)<\/script>/);
      const event = JSON.parse(raw)['@graph'].find((n) => n['@type'] === 'Event');
      const performers = [].concat(event.performer ?? []);
      const credit = attr(p.html, /data-test="guest-credit"[^>]*>[\s\S]*?<strong[^>]*>([^<]+)/);
      const credited = text(credit ?? '').split(', ').filter(Boolean);
      assert.ok(credited.length, `${p.path} has a guest credit with no name`);
      for (const name of credited) {
        assert.ok(performers.some((x) => x['@type'] === 'Person' && x.name === name),
          `${p.path} credits ${name} on the page but not in the Event`);
      }
    }
  });

  // The section is gated on a role *or* a bio, so a rendered guest row must
  // carry one of the two — otherwise the gate has drifted from what it lets
  // through. It was a bio alone until 2026-08-11; `Role` moved onto the people
  // database that day precisely so a block could open on the cheaper of the
  // two, because 72 of 119 people have no bio and a role is one line.
  //
  // Asserted against the structured data rather than the markup, so this reads
  // what a machine is told about the person, not how the page happens to lay
  // them out.
  test('a rendered guest row introduces the person', () => {
    for (const p of all.filter((x) => /^\/sessions\/[^/]+\/$/.test(x.path))) {
      if (!p.html.includes('data-test="guest"')) continue;
      const raw = attr(p.html, /application\/ld\+json[^>]*>([\s\S]*?)<\/script>/);
      const event = JSON.parse(raw)['@graph'].find((n) => n['@type'] === 'Event');
      const performers = [].concat(event.performer ?? []);
      assert.ok(performers.some((x) => x.description || x.jobTitle),
        `${p.path} renders a Guests section but nobody in it has a role or a bio`);
    }
  });
});

describe('the upcoming/past split', () => {
  // The home and session-index heroes must ship *every* upcoming session, or
  // the client-side sweep has nothing to promote and the pick silently freezes
  // at build time again.
  const upcomingInContent = () => {
    const dir = 'src/content/sessions';
    const grace = 3 * 60 * 60 * 1000;
    return readdirSync(dir).filter((f) => f.endsWith('.md')).filter((f) => {
      const md = readFileSync(join(dir, f), 'utf8');
      const status = md.match(/^status:\s*"?([^"\n]+)"?/m)?.[1]?.trim();
      const dt = md.match(/^datetime:\s*"?([^"\n]+)"?/m)?.[1]?.trim();
      return status === 'Published' && dt && +new Date(dt) + grace > Date.now();
    }).length;
  };

  for (const path of ['/', '/sessions/']) {
    test(`${path} ships every upcoming session, not just the first`, () => {
      const page = all.find((p) => p.path === path);
      const rendered = countHook(page.html, 'next-session');
      assert.equal(rendered, upcomingInContent(),
        `${path} rendered ${rendered} upcoming sessions; the sweep can only choose between what ships`);
    });
  }

  test('the archive runs from yesterday backwards', () => {
    // Each card carries its date on an inner <time data-iso>, so read the
    // results region in document order rather than guessing from the anchor.
    const page = all.find((p) => p.path === '/sessions/');
    // Bounded by two hooks, not by a class or an id: the region is whatever
    // sits between the results and the control that reveals more of them.
    const start = page.html.indexOf('data-test="results"');
    const after = page.html.indexOf('data-test="load-more"', start);
    assert.ok(start > 0, 'could not find the results region on /sessions/');
    const region = page.html.slice(start, after > start ? after : undefined);

    const isos = [...region.matchAll(/data-iso="([^"]+)"/g)].map((m) => +new Date(m[1]));
    assert.ok(isos.length > 10, `read only ${isos.length} dates from the archive`);
    for (let i = 1; i < isos.length; i++) {
      assert.ok(isos[i] <= isos[i - 1],
        `out of order at ${i}: ${new Date(isos[i]).toISOString()} follows ${new Date(isos[i - 1]).toISOString()}`);
    }
    assert.ok(isos[0] < Date.now(), 'the archive leads with a session that has not happened yet');
  });

  test('the home page lists its latest sessions newest first', () => {
    const page = all.find((p) => p.path === '/');
    // Bounded by a hook, not by the words in a heading: this test is about the
    // order of the cards, and it should survive rewording the section.
    const start = page.html.indexOf('data-test="latest-sessions"');
    assert.ok(start > 0, 'could not find the latest-sessions region on the home page');
    const region = page.html.slice(start, page.html.indexOf('</section>', start));
    const isos = [...region.matchAll(/data-iso="([^"]+)"/g)].map((m) => +new Date(m[1]));
    assert.ok(isos.length >= 4, `expected several latest sessions, read ${isos.length}`);
    for (let i = 1; i < isos.length; i++) {
      assert.ok(isos[i] <= isos[i - 1], `latest sessions out of order at ${i}`);
    }
  });
});

describe('the conferences row', () => {
  const home = () => all.find((p) => p.path === '/');
  const region = () => {
    const html = home().html;
    const start = html.indexOf('data-test="conferences"');
    return start > 0 ? html.slice(start, html.indexOf('</section>', start)) : '';
  };

  test('every conference in the collection gets a card', () => {
    // The directory is absent until the first sync writes it, which is a
    // legitimate state and not a failure: the collection is generated, so it
    // does not exist in a checkout that has never synced.
    let onDisk = 0;
    try { onDisk = published('conferences', '.json'); } catch { return; }
    if (!onDisk) return; // the database is empty, or every row is unticked
    assert.equal(countHook(home().html, 'conference-card'), onDisk,
      'the home page dropped a conference the collection has');
  });

  test('each card links out, and carries the dates the sweep re-reads', () => {
    // The card is the whole of a conference here — there is no page of ours to
    // land on — so a card that does not leave the site is a dead card.
    const cards = [...region().matchAll(/<a class="card conf" href="([^"]*)"[^>]*data-start="([^"]*)"/g)];
    if (!cards.length) return;
    for (const [, href, start] of cards) {
      assert.match(href, /^https:\/\//, `a conference card links to "${href}" rather than out to the conference`);
      assert.ok(!Number.isNaN(+new Date(start)), `a conference card carries an unreadable start date "${start}"`);
    }
  });

  test('is ordered soonest first, with editions that have been at the end', () => {
    // The browser re-applies this rule as time passes, but it has to be right
    // in the HTML too: that is what a reader without JavaScript sees.
    const starts = [...region().matchAll(/data-start="([^"]+)"/g)].map((m) => +new Date(m[1]));
    const ends = [...region().matchAll(/data-end="([^"]+)"/g)].map((m) => +new Date(m[1]));
    if (starts.length < 2) return;
    const day = 86400000;
    const past = starts.map((s, i) => (ends[i] ?? s) + day <= Date.now());
    const firstPast = past.indexOf(true);
    if (firstPast >= 0) {
      assert.ok(past.slice(firstPast).every(Boolean),
        'a conference still to come is sitting behind one that has been');
    }
    const live = starts.filter((_, i) => !past[i]);
    for (let i = 1; i < live.length; i++) {
      assert.ok(live[i] >= live[i - 1], `conferences out of order at ${i}`);
    }
  });
});

describe('sessions in their two states', () => {
  // One template renders both. Getting this wrong means either advertising an
  // event that has been, or hiding the joining details for one that has not.
  //
  // "Past" is `hasFinished` from src/lib/upcoming.ts, the same rule the pages
  // are built with, imported rather than restated. This test used to say
  // `start > Date.now()`, with no grace at all, while the site keeps a session
  // live for three hours after it starts so somebody arriving late still gets
  // the join link. For those three hours the two disagreed by design, and any
  // content change in that window failed the deploy: it did on 2026-08-05 at
  // 05:59 and again at 06:25, both inside the window after a session that
  // started at 06:00 UTC.
  //
  // A residual race is unavoidable and much smaller: the pages were built a
  // couple of minutes before this runs, so a session crossing the three-hour
  // line in between still trips it. Three hours of certainty became two
  // minutes of chance.
  const sessionPages = () => all.filter((p) => /^\/sessions\/[^/]+\/$/.test(p.path));
  const startOf = (p) => +new Date(attr(p.html, /<time[^>]*data-iso="([^"]+)"/));
  const finished = (p) => hasFinished(startOf(p), Date.now());

  test('a past session offers no RSVP, no join link and no calendar file', () => {
    const bad = [];
    for (const p of sessionPages()) {
      if (!finished(p)) continue;
      if (p.html.includes('data-test="add-to-calendar"')) bad.push(`${p.path}: offers a calendar file`);
      if (/class="[^"]*\bjs-live\b/.test(p.html)) bad.push(`${p.path}: still shows joining links`);
      if (/>RSVP/.test(p.html)) bad.push(`${p.path}: still asks for an RSVP`);
    }
    assert.deepEqual(bad, [], bad.join('\n'));
  });

  test('an upcoming session offers a way in', () => {
    const upcoming = sessionPages().filter((p) => !finished(p));
    for (const p of upcoming) {
      assert.ok(
        p.html.includes('data-test="add-to-calendar"') || /RSVP/.test(p.html),
        `${p.path} is upcoming but offers no RSVP and no calendar file`,
      );
    }
  });

  test('the calendar file states the session\'s real start time', () => {
    // A timezone slip here is invisible on the site and puts the event in
    // someone's calendar at the wrong hour.
    const offering = all.filter((p) => p.html.includes('data-test="add-to-calendar"'));
    assert.ok(offering.length > 0, 'no session offers a calendar file');
    for (const p of offering) {
      const ics = readFileSync(`${DIST}${p.path}event.ics`, 'utf8');
      const stamp = ics.match(/DTSTART:(\d{8}T\d{6})Z/)[1];
      const asUtc = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}T${stamp.slice(9, 11)}:${stamp.slice(11, 13)}:${stamp.slice(13, 15)}Z`;
      assert.equal(+new Date(asUtc), startOf(p),
        `${p.path}: calendar says ${asUtc}, the page says ${new Date(startOf(p)).toISOString()}`);
    }
  });
});

describe('prev/next navigation', () => {
  test('round-trips: the next of a page\'s previous is that page', () => {
    const byPath = new Map(all.map((p) => [p.path, p]));
    const link = (p, which) => attr(p.html, new RegExp(`data-test="${which}" href="([^"]+)"`));
    const checked = [];
    for (const p of all) {
      const prev = link(p, 'prev');
      if (!prev) continue;
      const back = byPath.get(prev);
      assert.ok(back, `${p.path} links to a previous page that does not exist: ${prev}`);
      assert.equal(link(back, 'next'), p.path,
        `${prev} does not point back to ${p.path} as its next`);
      checked.push(p.path);
    }
    assert.ok(checked.length > 10, `only ${checked.length} pages have prev/next`);
  });
});

describe('heuristic type pages', () => {
  test('each lists only its own type, and the counts agree', () => {
    const types = ['design-heuristics', 'guiding-heuristics', 'value-based-heuristics'];
    let total = 0;
    for (const type of types) {
      const page = all.find((p) => p.path === `/heuristics/${type}/`);
      assert.ok(page, `/heuristics/${type}/ was not built`);
      const shown = [...markup(page.html).matchAll(/data-test="card"[^>]*data-type="([^"]+)"/g)].map((m) => m[1]);
      assert.ok(shown.length > 0, `/heuristics/${type}/ lists nothing`);
      assert.deepEqual([...new Set(shown)], [type], `/heuristics/${type}/ lists other types`);
      total += shown.length;
    }
    const index = all.find((p) => p.path === '/heuristics/');
    const onIndex = countHook(index.html, 'card');
    assert.equal(total, onIndex, `the three type pages hold ${total}, the index holds ${onIndex}`);
  });
});

describe('the sitemap', () => {
  test('offers only pages that are indexable and served directly', () => {
    const xml = readFileSync(`${DIST}/sitemap-0.xml`, 'utf8');
    const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
    assert.ok(paths.length > 50, `sitemap holds only ${paths.length} URLs`);

    const noindex = new Set(all.filter((p) => /content="noindex/.test(p.html)).map((p) => p.path));
    const listed = paths.filter((p) => noindex.has(p));
    assert.deepEqual(listed, [], `noindex pages are in the sitemap: ${listed.join(', ')}`);

    // The three type indexes are duplicate views of /heuristics/ and are
    // deliberately excluded; a config change must not quietly restore them.
    for (const t of ['design-heuristics', 'guiding-heuristics', 'value-based-heuristics']) {
      assert.ok(!paths.includes(`/heuristics/${t}/`), `/heuristics/${t}/ should not be in the sitemap`);
    }

    const built = new Set(all.map((p) => p.path));
    const ghosts = paths.filter((p) => !built.has(p));
    assert.deepEqual(ghosts, [], `sitemap lists URLs with no page: ${ghosts.join(', ')}`);
  });
});

describe('error pages', () => {
  test('404 and 410 are built and kept out of the index', () => {
    for (const f of ['404.html', '410/index.html']) {
      assert.ok(existsSync(`${DIST}/${f}`), `${f} missing — the host would serve its own`);
      const html = readFileSync(`${DIST}/${f}`, 'utf8');
      assert.match(html, /content="noindex/, `${f} should be noindex`);
      assert.match(html, /href="\/sessions\//, `${f} should offer a way back into the site`);
    }
  });

  test('.htaccess points at them', () => {
    const ht = readFileSync(`${DIST}/.htaccess`, 'utf8');
    assert.match(ht, /^ErrorDocument 404 \/404\.html$/m);
    assert.match(ht, /^ErrorDocument 410 \/410\/$/m);
  });
});

describe('where to listen', () => {
  // The card that sends someone to the show in their own podcast app, and to
  // this episode on Apple. Both halves fail silently: a wrong link still
  // renders, and a missing episode link looks exactly like an episode Apple
  // does not have.
  const withPlayer = (prefix) =>
    all.filter((p) => new RegExp(`^${prefix}[^/]+/$`).test(p.path) && p.html.includes('player.captivate.fm/episode/'));

  test('every page with a player says where else to hear it', () => {
    const bad = [];
    for (const prefix of ['/sessions/', '/facilitating-archdes/']) {
      for (const p of withPlayer(prefix)) {
        if (!p.html.includes('data-test="listen-on"')) bad.push(p.path);
      }
    }
    assert.deepEqual(bad, [], `has an episode embedded but no way to follow the show:\n${bad.join('\n')}`);
  });

  test('an episode link points at the show it belongs to', () => {
    // Two shows, two Apple IDs. Rendering a story's episode under the sessions
    // ID would 404 quietly, and only for the people who click.
    const ids = { '/sessions/': '1478089740', '/facilitating-archdes/': '1837176113' };
    let checked = 0;
    for (const [prefix, id] of Object.entries(ids)) {
      for (const p of withPlayer(prefix)) {
        const tag = attr(p.html, /(<a[^>]*data-test="listen-episode"[^>]*>)/);
        if (!tag) continue;
        checked++;
        const href = attr(tag, /href="([^"]+)"/);
        assert.ok(
          href?.startsWith(`https://podcasts.apple.com/podcast/id${id}?i=`),
          `${p.path}: episode link is not an episode of show ${id} — ${href}`,
        );
      }
    }
    assert.ok(checked > 0, 'no page offered an episode link, so this proved nothing');
  });

  test('the join to Apple still holds for nearly every session', () => {
    // A threshold, not a count, and it is a real bug this catches rather than a
    // hypothetical one. What Notion stores is Captivate's *media* ID; what
    // Apple answers with is the RSS `<guid>`. Those are the same string only
    // for the episodes recorded natively on Captivate, so the obvious join
    // silently resolved 8 of 59 and looked like it worked. The feed is what
    // relates the two — see scripts/sync-podcast-episodes.ts.
    //
    // Deliberately not "all of them": an episode ageing out of the feed window
    // is Captivate's business, not a broken build, and must not stop a deploy.
    const sessions = withPlayer('/sessions/');
    const linked = sessions.filter((p) => p.html.includes('data-test="listen-episode"'));
    assert.ok(sessions.length > 40, `only ${sessions.length} sessions have a player`);
    assert.ok(
      linked.length >= sessions.length * 0.9,
      `only ${linked.length} of ${sessions.length} sessions resolved to an Apple episode`,
    );
  });
});

describe('feeds and machine-readable files', () => {
  test('sitemap, RSS, robots.txt and llms.txt exist', () => {
    for (const f of ['sitemap-index.xml', 'rss.xml', 'robots.txt', 'llms.txt', 'llms-full.txt', '.htaccess']) {
      assert.ok(existsSync(`${DIST}/${f}`), `${f} missing from the build`);
    }
  });

  // Every content page ships its own markdown. The promise is the pair: a page
  // that advertises one must have it, and it must say which page it came from
  // — a markdown file that has drifted from its page is worse than none.
  test('a page offering markdown has it, and it points back', () => {
    const offered = all.filter((p) => /type="text\/markdown"/.test(p.html));
    const entries = ['sessions', 'stories', 'heuristics', 'open-spaces', 'ddd-crew']
      .reduce((n, c) => n + published(c), 0);
    assert.equal(offered.length, entries,
      'every entry in a content collection should offer its markdown');
    for (const p of offered) {
      const href = attr(p.html, /<link rel="alternate" type="text\/markdown"[^>]*href="([^"]+)"/);
      assert.equal(href, `${p.path}index.md`, `${p.path} advertises ${href}`);
      const md = readFileSync(`${DIST}${href}`, 'utf8');
      assert.ok(md.startsWith('---\n'), `${href} has no front matter`);
      assert.ok(md.includes(`source: "https://virtualddd.com${p.path}"`), `${href} does not name its page`);
      assert.ok(md.split('---\n')[2]?.trim(), `${href} has front matter but no body`);
    }
  });

  test('llms-full.txt carries the corpus, and not the republished part', () => {
    const full = readFileSync(`${DIST}/llms-full.txt`, 'utf8');
    assert.ok(full.length > 200_000, `llms-full.txt is only ${full.length} bytes`);
    for (const section of ['# Online sessions', '# Facilitating Stories', '# Heuristics', '# Open Space']) {
      assert.ok(full.includes(section), `llms-full.txt has no ${section} section`);
    }
    // ddd-crew is CC BY-SA with its canonical upstream; we list it, we do not
    // fold someone else's corpus into a file that reads as ours. A session that
    // links to a ddd-crew repo in its own body is fine — what must not appear
    // is a ddd-crew page reproduced here as a source.
    const sources = full.split('\n').filter((l) => l.startsWith('Source: '));
    const ours = ['sessions', 'stories', 'heuristics', 'open-spaces'].reduce((n, c) => n + published(c), 0);
    assert.equal(sources.length, ours, 'llms-full.txt should carry every entry we author');
    assert.deepEqual(sources.filter((l) => l.includes('/ddd-crew/')), [],
      'llms-full.txt reproduces republished ddd-crew pages');
    assert.ok(readFileSync(`${DIST}/llms.txt`, 'utf8').includes('/llms-full.txt'),
      'llms.txt does not point at llms-full.txt');
  });

  test('RSS lists sessions and stories, newest first', () => {
    const xml = readFileSync(`${DIST}/rss.xml`, 'utf8');
    const dates = [...xml.matchAll(/<pubDate>([^<]+)<\/pubDate>/g)].map((m) => +new Date(m[1]));
    assert.ok(dates.length >= 20, `expected 20+ feed items, got ${dates.length}`);
    for (let i = 1; i < dates.length; i++) {
      assert.ok(dates[i] <= dates[i - 1], 'feed items are not newest-first');
    }
    assert.match(xml, /\/sessions\//);
    assert.match(xml, /\/facilitating-archdes\//);
  });

  test('robots.txt allows AI crawlers and points at the sitemap', () => {
    const txt = readFileSync(`${DIST}/robots.txt`, 'utf8');
    for (const bot of ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']) {
      assert.match(txt, new RegExp(`User-agent: ${bot}\\s*\\nAllow: /`), `${bot} not allowed`);
    }
    assert.match(txt, /Sitemap: https:\/\/virtualddd\.com\/sitemap-index\.xml/);
    // Blocking these would strand the 289 legacy tag redirects.
    assert.doesNotMatch(txt, /^Disallow: \/\*\?tag=/m);
  });

  test('every session offering a calendar file has one', () => {
    const offering = all.filter((p) => p.html.includes('data-test="add-to-calendar"'));
    for (const p of offering) {
      const ics = `${DIST}${p.path}event.ics`;
      assert.ok(existsSync(ics), `${p.path} offers a calendar file that wasn't built`);
      const body = readFileSync(ics, 'utf8');
      assert.match(body, /BEGIN:VCALENDAR/);
      assert.match(body, /DTSTART:\d{8}T\d{6}Z/);
    }
  });
});

describe('the deploy', () => {
  test('stays under the size we agreed to ship', () => {
    // prune-dist.mjs runs as part of the build and drops the unreferenced
    // originals Astro emits beside its .webp. When it silently stops working
    // the deploy nearly doubles, and rsync over SSH to shared hosting is the
    // one place that hurts. A ceiling, not an exact figure — content grows.
    const CEILING_MB = 50;
    const bytes = (dir) => readdirSync(dir, { withFileTypes: true }).reduce((sum, e) => {
      const p = join(dir, e.name);
      return sum + (e.isDirectory() ? bytes(p) : statSync(p).size);
    }, 0);
    const mb = bytes(DIST) / 1024 / 1024;
    assert.ok(mb < CEILING_MB, `dist is ${mb.toFixed(1)} MB, over the ${CEILING_MB} MB ceiling — has prune-dist stopped working?`);
  });

  test('references no asset that was pruned away', () => {
    const missing = new Set();
    for (const p of all) {
      for (const m of p.html.matchAll(/(?:src|href)="(\/_astro\/[^"]+)"/g)) {
        if (!existsSync(`${DIST}${m[1]}`)) missing.add(`${m[1]} (from ${p.path})`);
      }
    }
    assert.deepEqual([...missing], [], `pruned assets still referenced:\n${[...missing].join('\n')}`);
  });
});

describe('the documentation', () => {
  // The brief is nine files that point at each other. A link that rots is the
  // failure mode of splitting one file into several, so it is worth a test
  // rather than a promise.
  test('every internal link in the docs resolves', () => {
    const docs = ['README.md', 'AGENTS.md', 'CLAUDE.md', 'data/README.md',
      ...readdirSync('docs').filter((f) => f.endsWith('.md')).map((f) => `docs/${f}`)];
    const bad = [];
    for (const doc of docs) {
      const dir = doc.includes('/') ? doc.slice(0, doc.lastIndexOf('/')) : '.';
      const text = readFileSync(doc, 'utf8');
      for (const [, target] of text.matchAll(/\]\((?!https?:|#|mailto:)([^)]+)\)/g)) {
        const [path, anchor] = target.split('#');
        if (!path) continue;
        const resolved = join(dir, path);
        if (!existsSync(resolved)) { bad.push(`${doc} → ${target} (no ${resolved})`); continue; }
        if (anchor) {
          // Headings become anchors; check the one we linked to exists.
          const slugs = [...readFileSync(resolved, 'utf8').matchAll(/^#+ (.+)$/gm)]
            .map(([, h]) => h.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-'));
          if (!slugs.includes(anchor)) bad.push(`${doc} → ${target} (no such heading)`);
        }
      }
    }
    assert.deepEqual(bad, [], `broken documentation links:\n${bad.join('\n')}`);
  });
});

describe('the learning journey board', () => {
  // /learn/ draws its board from the stages and from relations the sync
  // resolved into their front matter. A relation that quietly resolves to
  // nothing produces a page that is *valid* and simply says less, which is
  // indistinguishable from a stage nobody curated yet. That is exactly how two
  // fields vanished from every person on this site in one week with the deploy
  // green throughout, so it gets a relationship assertion rather than trust.
  const board = () => all.find((p) => p.path === '/learn/');
  const DIR = 'src/content/learning-journey';
  const stageFiles = () => readEntries(DIR).filter((f) => f.endsWith('.md'));

  test('every published stage is a step on the board', () => {
    const stages = published('learning-journey');
    assert.ok(stages > 0, 'the sync produced no learning-journey stages');
    assert.equal(countHook(board().html, 'journey-step'), stages);
  });

  test('every resource a stage carries reaches the board', () => {
    // Equality, not "at least one". The first draft of this test asked whether
    // a stage that declares resources renders any, and both stages still had
    // their videos when the book and tool lookups were sabotaged, so it passed
    // while the board had quietly lost half its stickies.
    //
    // Deliberately not a count of *which* resources: that is editorial and
    // belongs in tests/content/. The two collections sync in the same run, so
    // what the front matter lists is what the page owes the reader.
    const declared = (md) =>
      (md.match(/^ {2}- title:/gm) ?? []).length
      + ['books', 'tools'].reduce((n, key) => {
        const m = md.match(new RegExp(`^${key}: \\[(.*)\\]$`, 'm'));
        return n + (m ? (m[1].match(/"/g) ?? []).length / 2 : 0);
      }, 0);

    const owed = stageFiles().reduce((n, f) => n + declared(readEntry(`${DIR}/${f}`, 'utf8')), 0);
    assert.ok(owed > 0, 'no stage declares any resource, so this proves nothing');
    assert.equal(
      countHook(board().html, 'journey-resource'), owed,
      'the stages carry more resources than the board renders, so a lookup is dropping them',
    );
  });

  test('the board says where it runs out', () => {
    // The open end is what invites people to fill it in. Losing it would take
    // the only call to action on the page with it.
    assert.equal(countHook(board().html, 'journey-open'), 1);
  });
});
