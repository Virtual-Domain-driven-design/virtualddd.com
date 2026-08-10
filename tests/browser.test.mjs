/** Behaviour, in a real browser, against the *built* site.
 *
 * These cover what static HTML checks cannot: layout at real viewport widths,
 * and the progressive-enhancement scripts. Every failure here has a precedent —
 * the mobile overflow that affected 14 of 24 story pages was invisible to every
 * other kind of check.
 *
 * **Selectors are the contract.** Tests here select only `[data-test]` hooks and
 * `js-*` behaviour classes, never a styling class and never visible copy, so
 * restyling a section cannot break them. See docs/testing.md, "The test surface".
 *
 * Run after `npm run build`. Sampled rather than exhaustive so it stays quick;
 * `npm run test:full` widens the sample.
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
import { readdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { serveDist } from './helpers.mjs';

const FULL = process.env.TEST_FULL === '1';
const sample = (dir, base, n) => {
  const all = readdirSync(`src/content/${dir}`)
    .filter((f) => f.endsWith('.md'))
    .map((f) => `${base}${f.replace(/\.md$/, '')}/`);
  return FULL ? all : all.slice(0, n);
};

let server, base, browser;

before(async () => {
  ({ server, base } = await serveDist());
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
  server?.close();
});

/** Count what the visitor can actually see. */
const visible = (page, selector) =>
  page.$$eval(selector, (els) => els.filter((e) => e.offsetParent !== null || e.getClientRects().length).length);

describe('layout', () => {
  // 360px is the narrowest phone worth supporting; 390 is a current iPhone.
  for (const width of [360, 390]) {
    test(`no horizontal overflow at ${width}px`, async () => {
      const ctx = await browser.newContext({ viewport: { width, height: 800 } });
      const page = await ctx.newPage();
      const paths = [
        '/', '/sessions/', '/facilitating-archdes/', '/open-space/', '/heuristics/',
        '/ddd-crew/', '/podcasts/', '/organisers/', '/book-club/', '/about-us/', '/ddd-heuristics/',
        // /learn/ carries the EventStorming board, which is the one thing on
        // this site that scrolls sideways on purpose. If that ever escapes its
        // own container the whole page scrolls, which is exactly the defect
        // this test was written for.
        '/learn/',
        ...sample('sessions', '/sessions/', 8),
        ...sample('stories', '/facilitating-archdes/', 8),
        ...sample('heuristics', '/heuristics/', 5),
        ...sample('ddd-crew', '/ddd-crew/', 4),
        ...sample('open-spaces', '/open-space/', 3),
      ];
      const bad = [];
      for (const p of paths) {
        // 'load', not 'domcontentloaded': before the stylesheet applies the
        // carousels are briefly unstyled block elements and every page reads as
        // 400-470px wide. Measuring then produces confident nonsense.
        await page.goto(base + p, { waitUntil: 'load' });
        const w = await page.evaluate(() => document.documentElement.scrollWidth);
        if (w > width + 1) {
          const who = await page.evaluate((vw) =>
            [...document.querySelectorAll('main *')]
              .filter((e) => e.getBoundingClientRect().width > vw + 30)
              .slice(0, 2)
              .map((e) => `${e.tagName.toLowerCase()}.${(e.className || '').toString().split(' ')[0]}`), width);
          bad.push(`${p} → ${w}px (${who.join(', ')})`);
        }
      }
      await ctx.close();
      assert.deepEqual(bad, [], `pages scrolling sideways:\n${bad.join('\n')}`);
    });
  }
});

describe('the next session', () => {
  // The rule itself — which of several upcoming sessions is next — is proved in
  // tests/unit/upcoming.test.mjs, because the site has only one upcoming
  // session to render. What is proved here is the wiring: that the choice is
  // made in the browser, from the clock, rather than frozen into the build.
  for (const path of ['/', '/sessions/']) {
    test(`${path} chooses its featured session from the clock, not the build`, async () => {
      const page = await browser.newPage();
      await page.goto(base + path, { waitUntil: 'load' });

      const heroes = await page.$$('[data-test="next-session"]');
      if (!heroes.length) {
        await page.close();
        return; // nothing scheduled; the section is absent by design
      }
      assert.equal(await visible(page, '[data-test="next-session"]'), 1,
        'exactly one upcoming session should be on show');

      // The session on show must be one that has not finished.
      const shownIso = await page.$eval('[data-test="next-session"]:not([hidden])', (el) => el.dataset.iso);
      assert.ok(new Date(shownIso).getTime() + 3 * 60 * 60 * 1000 > Date.now(),
        `the featured session (${shownIso}) has already been`);
      await page.close();
    });

    test(`${path} stops featuring a session once it has been`, async () => {
      // The defect this guards: the pick was made at build time, so a session
      // that had already happened kept its RSVP hero and a countdown stuck at
      // "Happening now" until someone rebuilt the site.
      const page = await browser.newPage();
      await page.goto(base + path, { waitUntil: 'load' });
      const isos = await page.$$eval('[data-test="next-session"]', (els) => els.map((e) => e.dataset.iso));
      if (!isos.length) { await page.close(); return; }

      // A day after the last upcoming session, nothing should still be offered.
      const after = new Date(Math.max(...isos.map((i) => +new Date(i))) + 86400000);
      await page.clock.install({ time: after });
      await page.goto(base + path, { waitUntil: 'load' });
      await page.clock.runFor(1000);
      assert.equal(await visible(page, '[data-test="next-session"]'), 0,
        'a session that has been and gone is still being advertised');
      await page.close();
    });
  }
});

describe('what is under the next session', () => {
  // The list of everything after the hero, and the block that replaces the
  // whole thing once nothing is left.
  //
  // The design this tests is "every count is a designed state": one session,
  // several, and none. Only one of those three is reachable by loading the site
  // today, and the other two arrive by the clock rather than by a deploy — the
  // last session of a run finishing is not a Notion edit, so nothing rebuilds.
  // Which is exactly how the defect this replaced survived: with two sessions
  // announced, the home page rendered the second one nowhere at all and
  // /sessions/ put it in a four-column grid on its own.
  //
  // So each state is reached by moving the clock, and each assertion is about
  // what the page decided, not how it looks.

  /** The upcoming sessions the page shipped, soonest first. */
  const shipped = (page) =>
    page.$$eval('[data-test="next-session"]', (els) =>
      els.map((e) => e.dataset.iso).sort());

  const state = (page) => page.evaluate(() => ({
    heroes: [...document.querySelectorAll('[data-test="next-session"]')].filter((e) => !e.hidden).length,
    rows: [...document.querySelectorAll('[data-test="upcoming-row"]')].filter((e) => !e.hidden).length,
    count: document.querySelector('[data-test="upcoming-count"]')?.textContent.trim() ?? '',
    empty: !document.querySelector('[data-test="no-sessions"]')?.hidden,
  }));

  for (const path of ['/', '/sessions/']) {
    test(`${path} lists every announced session except the one it is leading with`, async () => {
      const page = await browser.newPage();
      await page.goto(base + path, { waitUntil: 'load' });
      const isos = await shipped(page);
      if (isos.length < 2) { await page.close(); return; } // needs two to say anything

      // Well before any of them, so all are still to come.
      await page.clock.install({ time: new Date(new Date(isos[0]).getTime() - 20 * 86400000) });
      await page.goto(base + path, { waitUntil: 'load' });
      await page.clock.runFor(1000);

      const s = await state(page);
      assert.equal(s.heroes, 1, 'one session should be leading the page');
      assert.equal(s.rows, isos.length - 1,
        'every announced session except the hero belongs in the list underneath');
      assert.match(s.count, new RegExp(`^${isos.length - 1} more announced$`),
        `the count said "${s.count}" over ${s.rows} row(s); the two must not be able to disagree`);
      assert.equal(s.empty, false, 'the "nothing scheduled" block should not be on show');
      await page.close();
    });

    test(`${path} empties the list as sessions pass, without a rebuild`, async () => {
      // The state that produced the original hole: one left, nothing to list.
      const page = await browser.newPage();
      await page.goto(base + path, { waitUntil: 'load' });
      const isos = await shipped(page);
      if (isos.length < 2) { await page.close(); return; }

      // Just after the first, so only the last one is still to come.
      await page.clock.install({ time: new Date(new Date(isos.at(-2)).getTime() + 4 * 3600000) });
      await page.goto(base + path, { waitUntil: 'load' });
      await page.clock.runFor(1000);

      const s = await state(page);
      assert.equal(s.heroes, 1, 'the last remaining session should have taken the lead');
      assert.equal(s.rows, 0, 'nothing is left to list once the hero is the only one');
      assert.equal(s.count, 'Nothing else announced',
        'the count still claims there is more to see');
      assert.equal(s.empty, false, 'a session is still coming, so nothing is "between sessions"');
      await page.close();
    });

    test(`${path} says what to do when nothing is scheduled at all`, async () => {
      // The state nobody had designed: every announced session has been. The
      // page used to open on whatever came next, which reads as a site that has
      // stopped rather than a community between sessions.
      const page = await browser.newPage();
      await page.goto(base + path, { waitUntil: 'load' });
      const isos = await shipped(page);
      if (!isos.length) { await page.close(); return; }

      await page.clock.install({ time: new Date(new Date(isos.at(-1)).getTime() + 86400000) });
      await page.goto(base + path, { waitUntil: 'load' });
      await page.clock.runFor(1000);

      const s = await state(page);
      assert.equal(s.heroes, 0, 'a session that has been is still being advertised');
      assert.equal(s.rows, 0, 'a session that has been is still listed');
      assert.equal(s.empty, true,
        'nothing is scheduled and the page does not say so, or offer a way to change that');

      // The point of the block: somewhere to go. A dead end here is the whole
      // failure, not a missing decoration.
      const ways = await page.$$eval('[data-test="no-sessions"] a', (els) => els.map((e) => e.href));
      assert.ok(ways.some((h) => h.includes('discord')),
        `the empty state offers no way to propose a session: ${JSON.stringify(ways)}`);
      await page.close();
    });
  }
});

describe('the conferences row', () => {
  // The ordering rule is proved in tests/unit/conferences.test.mjs, because
  // every conference in Notion is in the future and will be for months. What is
  // proved here is the wiring: that a card stops claiming its dates from the
  // clock rather than from a rebuild, which is the case that actually happens —
  // a conference ending is not a Notion edit, so nothing rebuilds.
  const cards = (page) =>
    page.$$eval('[data-test="conference-card"]', (els) => els.map((e) => ({
      over: e.classList.contains('is-over'),
      date: e.querySelector('.js-conf-date')?.textContent?.trim(),
    })));

  test('a conference that has been drops to the end and stops naming dates', async () => {
    const page = await browser.newPage();
    await page.goto(base + '/', { waitUntil: 'load' });
    const ends = await page.$$eval('[data-test="conference-card"]',
      (els) => els.map((e) => e.dataset.end ?? e.dataset.start));
    if (ends.length < 2) { await page.close(); return; }

    // Two days after the *first* one finishes: it should be the only stale one.
    const first = Math.min(...ends.map((e) => +new Date(e)));
    await page.clock.install({ time: new Date(first + 2 * 86400000) });
    await page.goto(base + '/', { waitUntil: 'load' });
    await page.clock.runFor(1000);

    const shown = await cards(page);
    assert.equal(shown.filter((c) => c.over).length, 1,
      'exactly the conference that has finished should be marked stale');
    assert.equal(shown.at(-1).over, true, 'the stale conference is not last in the row');
    assert.match(shown.at(-1).date, /no new dates/i,
      'a stale card is still advertising dates that have been and gone');
    assert.equal(shown.filter((c) => !c.over).every((c) => !/no new dates/i.test(c.date)), true,
      'a conference still to come has lost its dates');
    await page.close();
  });

  test('nothing is dropped when every edition has been', async () => {
    // The row stays full on purpose. Hiding them would empty the section and
    // say less than a card saying no dates are announced.
    const page = await browser.newPage();
    await page.goto(base + '/', { waitUntil: 'load' });
    const before = (await cards(page)).length;
    if (!before) { await page.close(); return; }

    await page.clock.install({ time: new Date('2099-01-01T00:00:00Z') });
    await page.goto(base + '/', { waitUntil: 'load' });
    await page.clock.runFor(1000);
    const after = await cards(page);
    assert.equal(after.length, before, 'the row lost a conference once its dates passed');
    assert.equal(after.every((c) => c.over), true);
    await page.close();
  });
});

describe('filters and search', () => {
  test('the session archive searches, and every card left matches', async () => {
    const page = await browser.newPage();
    await page.goto(`${base}/sessions/`, { waitUntil: 'networkidle' });
    const total = Number((await page.textContent('[data-test="result-count"]')).match(/\d+/)[0]);
    assert.ok(total > 10, `the archive rendered only ${total} cards`);

    await page.fill('[data-test="filter-search"]', 'eventstorming');
    await page.waitForTimeout(200);
    const filtered = Number((await page.textContent('[data-test="result-count"]')).match(/\d+/)[0]);
    assert.ok(filtered > 0 && filtered < total, `search did nothing useful: ${filtered} of ${total}`);

    // The filter hides; it does not delete. Anything still on show must match.
    const shown = await page.$$eval('[data-test="results"] [data-test="card"]:not([hidden])',
      (els) => els.map((e) => `${e.dataset.title ?? ''}|${e.dataset.tags ?? ''}`));
    assert.ok(shown.length > 0, 'a search with matches showed no cards');
    assert.ok(shown.every((t) => t.includes('eventstorming')), 'a non-matching card stayed on show');

    await page.click('[data-test="filter-reset"]');
    await page.waitForTimeout(200);
    const restored = Number((await page.textContent('[data-test="result-count"]')).match(/\d+/)[0]);
    assert.equal(restored, total, 'reset did not restore the full list');
    await page.close();
  });

  test('filtering by tag shows only cards carrying that tag', async () => {
    const page = await browser.newPage();
    await page.goto(`${base}/sessions/`, { waitUntil: 'networkidle' });
    const tag = await page.$eval('[data-test="filter-tag"] option:nth-child(2)', (o) => o.value);
    await page.selectOption('[data-test="filter-tag"]', tag);
    await page.waitForTimeout(200);
    const shown = await page.$$eval('[data-test="results"] [data-test="card"]:not([hidden])',
      (els) => els.map((e) => e.dataset.tags ?? ''));
    assert.ok(shown.length > 0, `tag "${tag}" matched nothing`);
    assert.ok(shown.every((t) => t.includes(tag)), `a card without "${tag}" stayed on show`);
    await page.close();
  });

  test('a legacy tag URL lands pre-filtered', async () => {
    // 289 retired tag archives 301 here; landing on the unfiltered index
    // would make those redirects a lie.
    //
    // The tag is read off the page and slugified, rather than named here: this
    // suite blocks the deploy, and an editor renaming a tag in Notion must not
    // be able to turn it red.
    const page = await browser.newPage();
    await page.goto(`${base}/sessions/`, { waitUntil: 'domcontentloaded' });
    const tag = await page.$eval('[data-test="filter-tag"] option:nth-child(2)', (o) => o.value);
    const slug = tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    await page.goto(`${base}/sessions/?tag=${slug}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(200);
    const n = Number((await page.textContent('[data-test="result-count"]')).match(/\d+/)[0]);
    const total = await page.$$eval('[data-test="results"] [data-test="card"]', (e) => e.length);
    assert.ok(n > 0 && n < total, `expected a filtered subset of ${total}, got ${n}`);
    assert.equal(await page.inputValue('[data-test="filter-tag"]'), tag);
    await page.close();
  });

  test('an unknown tag shows everything rather than an empty page', async () => {
    const page = await browser.newPage();
    await page.goto(`${base}/sessions/?tag=this-tag-never-existed`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(200);
    const n = Number((await page.textContent('[data-test="result-count"]')).match(/\d+/)[0]);
    const total = await page.$$eval('[data-test="results"] [data-test="card"]', (e) => e.length);
    assert.equal(n, total, `an unknown tag filtered the archive down to ${n} of ${total}`);
    await page.close();
  });

  test('a filter and Load more do not hide matches from each other', async () => {
    // The archive reveals 30 at a time. If filtering did not reset that window,
    // a search could look empty while its matches sat in an unrevealed batch —
    // and the count would disagree with what is on screen.
    const page = await browser.newPage();
    await page.goto(`${base}/sessions/`, { waitUntil: 'networkidle' });
    const count = () => page.textContent('[data-test="result-count"]').then((t) => Number(t.match(/\d+/)[0]));
    const onScreen = () => page.$$eval('[data-test="results"] [data-test="card"]:not([hidden])', (e) => e.length);

    // Reveal everything, then filter: the window must go back to a first batch.
    for (let i = 0; i < 10 && await page.isVisible('[data-test="load-more"]'); i++) {
      await page.click('[data-test="load-more"]');
      await page.waitForTimeout(120);
    }
    await page.fill('[data-test="filter-search"]', 'design');
    await page.waitForTimeout(250);
    const matches = await count();
    assert.ok(matches > 0, 'the search matched nothing to test with');
    assert.ok(await onScreen() > 0, 'the count claims matches but nothing is on screen');

    // Everything the count promises must be reachable by pressing Load more.
    for (let i = 0; i < 20 && await page.isVisible('[data-test="load-more"]'); i++) {
      await page.click('[data-test="load-more"]');
      await page.waitForTimeout(120);
    }
    assert.equal(await onScreen(), matches,
      `the count says ${matches} but only ${await onScreen()} can be reached`);
    await page.close();
  });

  test('the stories index filters too', async () => {
    const page = await browser.newPage();
    await page.goto(`${base}/facilitating-archdes/`, { waitUntil: 'networkidle' });
    const total = Number((await page.textContent('[data-test="result-count"]')).match(/\d+/)[0]);
    const tag = await page.$eval('[data-test="filter-tag"] option:nth-child(2)', (o) => o.value);
    await page.selectOption('[data-test="filter-tag"]', tag);
    await page.waitForTimeout(200);
    const filtered = Number((await page.textContent('[data-test="result-count"]')).match(/\d+/)[0]);
    assert.ok(filtered > 0 && filtered <= total, `story tag filter returned ${filtered}`);
    await page.close();
  });

  test('the heuristics browser filters by type', async () => {
    const page = await browser.newPage();
    await page.goto(`${base}/heuristics/`, { waitUntil: 'networkidle' });
    const count = () => page.textContent('[data-test="result-count"]').then((t) => Number(t.match(/\d+/)[0]));
    const total = await count();

    // Which type is not the point — that picking one shows only that one is.
    // Reading the value off the control keeps this test out of the way of
    // renaming a heuristic type.
    const control = page.locator('[data-test="type-filter"]').nth(1);
    const wanted = await control.getAttribute('data-value');
    await control.click();
    await page.waitForTimeout(200);
    const guiding = await count();
    assert.ok(guiding > 0 && guiding < total, `type filter returned ${guiding} of ${total}`);
    const types = await page.$$eval('[data-test="card"]:not([hidden])', (els) => els.map((e) => e.dataset.type));
    assert.ok(types.every((t) => t === wanted), 'a heuristic of another type stayed on show');

    await page.click('[data-test="filter-reset"]');
    await page.waitForTimeout(200);
    assert.equal(await count(), total, 'reset did not restore the full list');
    await page.close();
  });
});

/** Site-wide search — the Pagefind index, not the per-archive filters above.
 *
 * These need the index that `pagefind --site dist` writes at the end of
 * `npm run build`, so they fail loudly if that step is ever dropped from the
 * build script rather than quietly testing nothing.
 */
describe('search across the site', () => {
  const hits = (page) => page.locator('[data-test="search-hit"]');

  test('finds pages in more than one section for one query', async () => {
    // The whole reason this exists: heuristics, sessions and stories cite each
    // other, and no per-archive filter can follow a thread across them.
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`${base}/search/`, { waitUntil: 'networkidle' });

    await page.fill('[data-test="search-input"]', 'bounded context');
    await hits(page).first().waitFor({ timeout: 20_000 });

    const urls = await hits(page).evaluateAll((els) =>
      els.map((e) => e.querySelector('h2 a')?.getAttribute('href') ?? ''));
    assert.ok(urls.length > 1, `one query returned ${urls.length} results`);
    const sections = new Set(urls.map((u) => u.split('/')[1]));
    assert.ok(sections.size > 1,
      `every result came from /${[...sections][0]}/ — search is not crossing sections`);
    assert.deepEqual(errors, [], `the page threw: ${errors.join('; ')}`);
    await page.close();
  });

  test('a search is a link somebody can share', async () => {
    const page = await browser.newPage();
    await page.goto(`${base}/search/?q=eventstorming`, { waitUntil: 'networkidle' });
    await hits(page).first().waitFor({ timeout: 20_000 });
    assert.equal(await page.inputValue('[data-test="search-input"]'), 'eventstorming',
      'the shared term did not reach the box');
    assert.ok(await hits(page).count() > 0, 'a shared link showed no results');
    await page.close();
  });

  test('says so rather than sitting silent when nothing matches', async () => {
    const page = await browser.newPage();
    await page.goto(`${base}/search/`, { waitUntil: 'networkidle' });
    await page.fill('[data-test="search-input"]', 'qwertyuiopnotaword');
    await page.waitForFunction(
      () => /Nothing matches/.test(document.querySelector('[data-test="search-count"]')?.textContent ?? ''),
      null, { timeout: 20_000 });
    assert.equal(await hits(page).count(), 0, 'no matches, but results were rendered');
    await page.close();
  });

  test('a card is not indexed, because the page it points at is', async () => {
    // Without this the archives matched almost any topical query: an index
    // page carries a hundred card titles and, before the filter bar opted out,
    // every tag in the collection run together as `<option>` text.
    const page = await browser.newPage();
    await page.goto(`${base}/search/`, { waitUntil: 'networkidle' });
    const top = await page.evaluate(async () => {
      const pf = await import('/pagefind/pagefind.js');
      const r = await pf.search('collaborative modelling');
      const data = await Promise.all(r.results.slice(0, 5).map((x) => x.data()));
      return data.map((d) => d.url);
    });
    assert.ok(top.length > 0, 'the index answered nothing at all');
    const archives = top.filter((u) => /^\/(sessions|facilitating-archdes|heuristics)\/$/.test(u));
    assert.deepEqual(archives, [],
      `an archive index outranked real pages: ${archives.join(', ')}`);
    await page.close();
  });

  test('every page reachable from the nav can be searched from it', async () => {
    const page = await browser.newPage();
    await page.goto(`${base}/sessions/`, { waitUntil: 'networkidle' });
    assert.equal(await page.getAttribute('[data-test="nav-search"]', 'href'), '/search/');
    await page.close();
  });
});

describe('time', () => {
  test('dates render in the visitor timezone, over a server-rendered fallback', async () => {
    const tz = 'Pacific/Auckland'; // far from UTC, so a swap is unambiguous
    const ctx = await browser.newContext({ timezoneId: tz });
    const page = await ctx.newPage();

    // What ships in the HTML, before any script runs.
    await page.goto(`${base}/sessions/`, { waitUntil: 'domcontentloaded' });
    const fallback = await page.$eval('.js-local', (el) => el.textContent.trim());
    assert.ok(fallback.length > 0, 'no server-rendered date to fall back to');

    await page.waitForTimeout(400);
    const swapped = await page.$eval('.js-local', (el) => el.textContent.trim());
    const iso = await page.$eval('.js-local', (el) => el.dataset.iso);
    const expected = new Date(iso).toLocaleString('en-NZ', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
    const hour = expected.match(/\d{1,2}/)[0];
    assert.match(swapped, new RegExp(`\\b${hour}`), `${swapped} is not the ${tz} time of ${iso}`);
    await ctx.close();
  });

  test('the countdown counts down, and turns over at the start', async () => {
    const page = await browser.newPage();
    await page.goto(base + '/', { waitUntil: 'load' });
    const el = await page.$('.js-countdown[data-iso]');
    if (!el) { await page.close(); return; }
    const iso = await el.getAttribute('data-iso');

    // An hour before: it must be counting, and the numbers must move.
    await page.clock.install({ time: new Date(+new Date(iso) - 3600_000) });
    await page.goto(base + '/', { waitUntil: 'load' });
    await page.clock.runFor(1500);
    const first = await page.$eval('.js-countdown', (e) => e.textContent);
    assert.match(first, /\d/, `countdown showed "${first}" an hour before the start`);
    await page.clock.runFor(5000);
    const later = await page.$eval('.js-countdown', (e) => e.textContent);
    assert.notEqual(later, first, 'the countdown is not ticking');

    // Once the start passes it must stop counting down to a time gone by.
    await page.clock.install({ time: new Date(+new Date(iso) + 60_000) });
    await page.goto(base + '/', { waitUntil: 'load' });
    await page.clock.runFor(1500);
    const now = await page.$eval('.js-countdown', (e) => e.textContent);
    assert.doesNotMatch(now, /-/, `countdown went negative: "${now}"`);
    assert.ok(now.trim().length > 0, 'the countdown emptied itself at the start');
    await page.close();
  });

  test('join links appear near the start and not before', async () => {
    const page = await browser.newPage();
    await page.goto(base + '/', { waitUntil: 'load' });
    const el = await page.$('.js-live[data-iso]');
    if (!el) { await page.close(); return; }
    const iso = await el.getAttribute('data-iso');

    for (const [offsetMs, shown, when] of [
      [-24 * 3600_000, false, 'a day before'],
      [-30 * 60_000, true, 'half an hour before'],
      [30 * 60_000, true, 'half an hour in'],
      [6 * 3600_000, false, 'six hours after'],
    ]) {
      await page.clock.install({ time: new Date(+new Date(iso) + offsetMs) });
      await page.goto(base + '/', { waitUntil: 'load' });
      await page.clock.runFor(1000);
      assert.equal(await visible(page, '.js-live') > 0, shown, `join links ${when} the start`);
    }
    await page.close();
  });
});

describe('progressive enhancement', () => {
  test('carousels scroll', async (t) => {
    // Needs a carousel with more cards than fit; a two-card row is legitimately
    // not scrollable, and asserting on one tests nothing.
    const page = await browser.newPage();
    const candidates = [
      '/facilitating-archdes/legacy-system-modernization-empathy/',
      '/facilitating-archdes/architectural-indecision/',
      '/heuristics/a-decision-is-what-gets-implemented/',
      '/',
    ];
    for (const path of candidates) {
      await page.goto(base + path, { waitUntil: 'load' });
      await page.waitForTimeout(300);
      const scrollable = await page.$$eval('[data-test="carousel"]', (els) =>
        els.some((el) => el.scrollWidth > el.clientWidth + 6));
      if (!scrollable) continue;

      const before = await page.$eval('[data-test="carousel"]', (el) => el.scrollLeft);
      await page.click('[data-test="carousel-next"]');
      await page.waitForTimeout(900);
      const after = await page.$eval('[data-test="carousel"]', (el) => el.scrollLeft);
      assert.ok(after > before, `the next arrow did not scroll the carousel on ${path}`);
      await page.close();
      return;
    }
    await page.close();
    t.skip('no scrollable carousel in the sample');
  });

  test('content is readable with JavaScript disabled', async () => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    for (const p of ['/', '/sessions/', '/heuristics/', '/facilitating-archdes/']) {
      await page.goto(base + p, { waitUntil: 'domcontentloaded' });
      const cards = await page.$$eval('[data-test="card"]', (els) => els.filter((e) => !e.hidden).length);
      assert.ok(cards > 0, `${p} shows nothing without JS`);
    }
    await ctx.close();
  });

  test('the whole navigation is reachable on a phone without JavaScript', async () => {
    // It was not: the hamburger needs a script, so all seven links were
    // unreachable at 390px with scripting off. The nav now ships open and the
    // script collapses it, which is the same shape as every other enhancement
    // here.
    for (const js of [false, true]) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, javaScriptEnabled: js });
      const page = await ctx.newPage();
      await page.goto(base + '/', { waitUntil: js ? 'load' : 'domcontentloaded' });
      const shown = await visible(page, '[data-test="nav"] a');
      const total = await page.$$eval('[data-test="nav"] a', (els) => els.length);
      assert.ok(total >= 5, `expected a full nav, found ${total} links`);
      if (js) {
        assert.equal(shown, 0, 'with JS the nav should start collapsed behind the hamburger');
      } else {
        assert.equal(shown, total, `without JS only ${shown} of ${total} nav links are reachable`);
      }
      await ctx.close();
    }
  });

  test('the page scrolls past its own header, once, without flicking back', async () => {
    // The defect this guards: the header shrank while it was still in the
    // document flow, so collapsing it took ~235px out of the page and the
    // browser returned them as scroll. That dropped the visitor back under the
    // threshold, the header grew again, and the next wheel notch repeated it —
    // wheel-scrolling a desktop page went 40, 0, 40, 0 and never got past the
    // header. Only the tall state was ever reachable by scrolling.
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(base + '/', { waitUntil: 'load' });
    await page.waitForTimeout(200);

    const step = 40;
    const notches = 8;
    const tall = await page.$eval('[data-test="site-header"]', (el) => el.offsetHeight);
    const seen = [];
    for (let i = 0; i < notches; i++) {
      await page.mouse.wheel(0, step);
      await page.waitForTimeout(120);
      seen.push(await page.evaluate(() => Math.round(window.scrollY)));
    }

    // Every notch moves the page, and none of them takes it backwards.
    const stuck = seen.filter((y, i) => y <= (seen[i - 1] ?? -1));
    assert.deepEqual(stuck, [], `the page fought back while scrolling: ${seen.join(' ')}`);
    assert.ok(seen.at(-1) >= step * notches - 4,
      `${notches} notches of ${step}px reached only ${seen.at(-1)}px: ${seen.join(' ')}`);

    // And the slim header is a state a scrolling visitor actually arrives in.
    const slim = await page.$eval('[data-test="site-header"]', (el) => el.offsetHeight);
    assert.ok(slim < tall, `the header never shrank: ${tall}px at rest, ${slim}px scrolled`);
    await ctx.close();
  });

  test('shrinking the header moves nothing else on the page', async () => {
    // The header is out of the flow and `--header-h` holds its place, so the
    // content below it may only move by however far the page was scrolled.
    // If the spacer is ever wrong, this is what catches it.
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(base + '/', { waitUntil: 'load' });
    await page.waitForTimeout(200);

    const top = await page.$eval('main', (el) => el.getBoundingClientRect().top);
    assert.ok(Math.abs(top - (await page.$eval('[data-test="site-header"]', (el) => el.offsetHeight))) < 2,
      `the page does not start where the header ends (main at ${top}px)`);

    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => ({
      top: document.querySelector('main').getBoundingClientRect().top,
      y: Math.round(window.scrollY),
    }));
    assert.equal(after.y, 300, 'the scroll position did not hold');
    assert.ok(Math.abs(top - after.top - 300) < 2,
      `the page jumped ${Math.round(top - after.top - 300)}px when the header collapsed`);
    await ctx.close();
  });

  test('the skip link lands below the header, not under it', async () => {
    // The header covers the top of the page, so an anchor that scrolls its
    // target to y=0 hides it. That defeats the skip link entirely: the one
    // visitor it exists for tabs, presses Enter, and the header is still all
    // they can see. `scroll-padding-top` in global.css holds it clear.
    for (const [width, js] of [[1440, true], [390, true], [1440, false]]) {
      const ctx = await browser.newContext({ viewport: { width, height: 800 }, javaScriptEnabled: js });
      const page = await ctx.newPage();
      await page.goto(base + '/', { waitUntil: js ? 'load' : 'domcontentloaded' });
      await page.waitForTimeout(js ? 300 : 100);

      await page.focus('[data-test="skip-link"]');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(700); // scroll-behavior is smooth

      const { mainTop, headerBottom } = await page.evaluate(() => ({
        mainTop: document.querySelector('main').getBoundingClientRect().top,
        headerBottom: document.getElementById('site-header').getBoundingClientRect().bottom,
      }));
      assert.ok(mainTop >= headerBottom - 1,
        `at ${width}px${js ? '' : ' without JS'} the content starts ${Math.round(headerBottom - mainTop)}px under the header`);
      await ctx.close();
    }
  });
});

describe('people on a session', () => {
  test('a multi-paragraph bio reads as paragraphs, not one wall', async () => {
    // Notion keeps a long bio as several paragraphs. Joined into one they made
    // the longest prose on the page — 850 characters — a single grey block set
    // smaller than the abstract above it.
    const page = await browser.newPage();
    await page.goto(`${base}/sessions/patterns-of-bdd-automation-a-fireside-chat-with-seb-rose-and-gaspar-nagy/`, { waitUntil: 'load' });
    const paras = await page.$$eval('[data-test="guest"] [data-test="person-bio"] p', (els) => els.map((e) => e.textContent.trim()));
    assert.ok(paras.length >= 4, `expected the bio to keep its paragraphs, got ${paras.length}`);
    assert.ok(paras.every((p) => p.length), 'an empty paragraph was rendered');
    // Body size and body colour: a bio this long is prose, not a caption.
    const size = await page.$eval('[data-test="person-bio"] p', (el) => parseFloat(getComputedStyle(el).fontSize));
    assert.ok(size >= 15, `bio is set at ${size}px`);
    await page.close();
  });

  test('a card names the guests its title does not', async () => {
    // The rule, and the stutter it exists to prevent: most session titles end
    // in "… with Nick Tune", and repeating that under the title reads as a bug.
    const page = await browser.newPage();
    await page.goto(`${base}/sessions/`, { waitUntil: 'load' });
    const cards = await page.$$eval('[data-test="card"]', (els) =>
      els.map((e) => ({
        title: e.querySelector('[data-test="card-title"]')?.textContent?.trim() ?? '',
        guests: e.querySelector('[data-test="card-guests"]')?.textContent?.trim() ?? '',
      })));
    const naming = cards.filter((c) => c.guests);
    assert.ok(naming.length > 5, `only ${naming.length} cards name a guest`);

    // Nobody named on a card is already named in its title.
    const stutters = naming.filter((c) => {
      const names = c.guests.replace(/^with /, '').replace(/ \+\d+ more$/, '').split(', ');
      const title = c.title.toLowerCase();
      return names.some((n) => {
        const parts = n.toLowerCase().split(/\s+/);
        return title.includes(parts[0]) && title.includes(parts[parts.length - 1]);
      });
    });
    assert.deepEqual(stutters, [], 'a card repeated a name its title already carries');
    await page.close();
  });

  test('searching a speaker finds their sessions', async () => {
    // The archive searched titles, hosts and tags — so a guest whose name the
    // title never mentions was unfindable by name.
    const page = await browser.newPage();
    await page.goto(`${base}/sessions/`, { waitUntil: 'networkidle' });
    await page.fill('[data-test="filter-search"]', 'mosior');
    await page.waitForTimeout(250);
    const count = Number((await page.textContent('[data-test="result-count"]')).match(/\d+/)[0]);
    assert.ok(count >= 1, 'searching a guest by name found nothing');
    await page.close();
  });
});

describe('accessibility basics', () => {
  // A whole-page audit, run on one page of each shape. This exists because a
  // pre-launch review found contrast, target-size and heading defects by hand
  // that 56 tests had missed — and because the four checks below it are the
  // specific ones worth naming, not the whole of accessibility.
  //
  // Scoped to WCAG 2.1/2.2 A and AA. A finding here is a real defect on a real
  // page, not a style opinion.
  test('axe finds nothing on a page of each shape', async () => {
    const axe = readFileSync(require.resolve('axe-core'), 'utf8');
    const page = await browser.newPage();
    const findings = [];
    for (const path of ['/', '/sessions/', '/sessions/what-is-an-aggregate-with-thomas-ploch/',
      '/heuristics/', '/heuristics/align-with-domain-experts/', '/organisers/', '/about-us/',
      '/facilitating-archdes/', '/404.html']) {
      await page.goto(base + path, { waitUntil: 'domcontentloaded' });
      await page.evaluate(axe);
      const result = await page.evaluate(async () =>
        await window.axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
        }));
      for (const v of result.violations) {
        findings.push(`${path} — ${v.id} (${v.impact}): ${v.nodes.length}× ${v.nodes[0].target.join(' ')}`);
      }
    }
    await page.close();
    assert.deepEqual(findings, [], `accessibility violations:\n${findings.join('\n')}`);
  });

  // The four defects a pre-launch review found by hand. Each was invisible to
  // the suite at the time, and each is the kind that comes back on the next
  // restyle unless something holds it down.

  test('the first tab stop skips the navigation', async () => {
    const page = await browser.newPage();
    await page.goto(base + '/sessions/', { waitUntil: 'domcontentloaded' });
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const a = document.activeElement;
      const box = a.getBoundingClientRect();
      return { hook: a.dataset.test, onScreen: box.top >= 0 && box.height > 0, href: a.getAttribute('href') };
    });
    assert.equal(r.hook, 'skip-link', 'the first tab stop should be the skip link');
    assert.ok(r.onScreen, 'the skip link must be visible once focused');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    const landed = await page.evaluate(() => document.activeElement?.id);
    assert.equal(landed, 'main', 'following it should put focus in the main landmark');
    await page.close();
  });

  test('filtering announces its result count', async () => {
    const page = await browser.newPage();
    for (const p of ['/sessions/', '/heuristics/', '/facilitating-archdes/']) {
      await page.goto(base + p, { waitUntil: 'domcontentloaded' });
      const live = await page.$eval('[data-test="result-count"]', (e) => e.getAttribute('aria-live'));
      assert.ok(live, `${p} updates a count nobody is told about`);
    }
    await page.close();
  });

  test('every button is at least 24px', async () => {
    // Links inside a sentence are exempt (WCAG 2.5.8, inline); a button is
    // never inline prose. The carousel dots were 9x9.
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const small = [];
    for (const p of ['/', '/sessions/', '/heuristics/']) {
      await page.goto(base + p, { waitUntil: 'domcontentloaded' });
      small.push(...await page.evaluate((path) => [...document.querySelectorAll('button')]
        .map((e) => { const r = e.getBoundingClientRect(); return { path, w: Math.round(r.width), h: Math.round(r.height),
          label: (e.getAttribute('aria-label') || e.textContent.trim()).slice(0, 20) }; })
        .filter((e) => e.w && e.h && (e.w < 24 || e.h < 24)), p));
    }
    assert.deepEqual(small, [], `buttons under 24px: ${JSON.stringify(small)}`);
    await page.close();
  });

  test('images have alt attributes and controls have accessible names', async () => {
    const page = await browser.newPage();
    const problems = [];
    for (const p of ['/', '/sessions/', '/heuristics/', '/organisers/', '/podcasts/']) {
      await page.goto(base + p, { waitUntil: 'domcontentloaded' });
      const r = await page.evaluate(() => ({
        noAlt: [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length,
        namelessButtons: [...document.querySelectorAll('button')]
          .filter((b) => !b.textContent.trim() && !b.getAttribute('aria-label')).length,
        namelessLinks: [...document.querySelectorAll('a')]
          .filter((a) => !a.textContent.trim() && !a.getAttribute('aria-label') && !a.querySelector('img[alt]:not([alt=""])')).length,
      }));
      if (r.noAlt) problems.push(`${p}: ${r.noAlt} img without alt`);
      if (r.namelessButtons) problems.push(`${p}: ${r.namelessButtons} button without a name`);
      if (r.namelessLinks) problems.push(`${p}: ${r.namelessLinks} link without a name`);
    }
    await page.close();
    assert.deepEqual(problems, [], problems.join('\n'));
  });

  test('keyboard focus is visible on the controls', async () => {
    // The filter inputs used to carry `outline: none`, and nothing defined a
    // replacement — so on a near-black canvas a keyboard visitor could not see
    // where they were.
    const page = await browser.newPage();
    await page.goto(`${base}/sessions/`, { waitUntil: 'networkidle' });
    const ring = async (selector) => {
      await page.focus(selector);
      return page.$eval(selector, (el) => {
        const s = getComputedStyle(el);
        return { width: parseFloat(s.outlineWidth) || 0, style: s.outlineStyle };
      });
    };
    for (const sel of ['[data-test="filter-search"]', '[data-test="filter-tag"]', '[data-test="filter-reset"]']) {
      const r = await ring(sel);
      assert.ok(r.width >= 2 && r.style !== 'none', `${sel} has no visible focus ring (${JSON.stringify(r)})`);
    }
    await page.close();
  });

  test('the mobile menu opens', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    assert.equal(await page.isVisible('[data-test="nav"] a'), false, 'nav should start collapsed on mobile');
    await page.click('[data-test="nav-toggle"]');
    await page.waitForTimeout(200);
    assert.equal(await page.isVisible('[data-test="nav"] a'), true, 'the hamburger did not open the nav');
    await ctx.close();
  });
});
