/** Browser tests against the *built* site, served the way a static host does.
 *
 * These cover what static HTML checks cannot: layout at real viewport widths,
 * and the progressive-enhancement scripts (filters, carousels, local time).
 * Every failure here has a precedent — the mobile overflow that affected 14 of
 * 24 story pages was invisible to every other kind of check.
 *
 * Run after `npm run build`. Sampled rather than exhaustive so it stays quick;
 * `npm run test:full` widens the sample.
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
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

describe('layout', () => {
  // 360px is the narrowest phone worth supporting; 390 is a current iPhone.
  for (const width of [360, 390]) {
    test(`no horizontal overflow at ${width}px`, async () => {
      const ctx = await browser.newContext({ viewport: { width, height: 800 } });
      const page = await ctx.newPage();
      const paths = [
        '/', '/sessions/', '/facilitating-archdes/', '/open-space/', '/heuristics/',
        '/ddd-crew/', '/podcasts/', '/organisers/', '/book-club/', '/about-us/', '/ddd-heuristics/',
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

describe('filters', () => {
  test('the session archive filters and counts', async () => {
    const page = await browser.newPage();
    await page.goto(`${base}/sessions/`, { waitUntil: 'networkidle' });
    const total = await page.textContent('#count');
    assert.match(total, /^\d+ sessions?$/);

    await page.fill('#q', 'eventstorming');
    await page.waitForTimeout(200);
    const filtered = Number((await page.textContent('#count')).split(' ')[0]);
    assert.ok(filtered > 0 && filtered < Number(total.split(' ')[0]), `filter did nothing: ${filtered}`);

    // Every visible card must actually match — the filter hides, it does not delete.
    const visibleTitles = await page.$$eval('#cards .card:not([hidden])', (els) =>
      els.map((e) => (e.dataset.title ?? '') + '|' + (e.dataset.tags ?? '')));
    assert.ok(visibleTitles.every((t) => t.includes('eventstorming')), 'a non-matching card stayed visible');

    await page.click('#f-reset');
    await page.waitForTimeout(200);
    assert.equal(await page.textContent('#count'), total, 'reset did not restore the full list');
    await page.close();
  });

  test('a legacy tag URL lands pre-filtered', async () => {
    const page = await browser.newPage();
    await page.goto(`${base}/sessions/?tag=collaborative-modelling`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(200);
    const n = Number((await page.textContent('#count')).split(' ')[0]);
    assert.ok(n > 0 && n < 100, `expected a filtered subset, got ${n}`);
    assert.equal(await page.inputValue('#f-tag'), 'collaborative modelling');
    await page.close();
  });

  test('an unknown tag shows everything rather than an empty page', async () => {
    const page = await browser.newPage();
    await page.goto(`${base}/sessions/?tag=this-tag-never-existed`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(200);
    const n = Number((await page.textContent('#count')).split(' ')[0]);
    assert.ok(n > 100, `unknown tag emptied the archive (${n} shown)`);
    await page.close();
  });

  test('the heuristics browser filters by type and by tag', async () => {
    const page = await browser.newPage();
    await page.goto(`${base}/heuristics/`, { waitUntil: 'networkidle' });
    const total = Number((await page.textContent('#hb-count')).split(' ')[0]);

    await page.click('.hb-banner[data-type="guiding-heuristics"]');
    await page.waitForTimeout(200);
    const guiding = Number((await page.textContent('#hb-count')).split(' ')[0]);
    assert.ok(guiding > 0 && guiding < total);

    await page.click('#hf-reset');
    await page.waitForTimeout(200);
    assert.equal(Number((await page.textContent('#hb-count')).split(' ')[0]), total);
    await page.close();
  });
});

describe('progressive enhancement', () => {
  test('dates render in the visitor timezone, with a server fallback', async () => {
    const page = await browser.newPage();
    await page.goto(`${base}/sessions/`, { waitUntil: 'domcontentloaded' });
    // The fallback text is in the HTML before any script runs.
    const raw = await page.$eval('.js-local', (el) => el.textContent.trim());
    assert.ok(raw.length > 0, 'no server-rendered date to fall back to');
    await page.waitForTimeout(400);
    const swapped = await page.$eval('.js-local', (el) => el.textContent.trim());
    assert.ok(swapped.length > 0);
    await page.close();
  });

  test('the countdown runs on an upcoming session', async () => {
    const page = await browser.newPage();
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const text = await page.$eval('.js-countdown', (el) => el.textContent);
    assert.match(text, /Starts in \d+d|Happening now/, `countdown said "${text}"`);
    await page.close();
  });

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
      const scrollable = await page.$$eval('.carousel', (els) =>
        els.some((el) => el.scrollWidth > el.clientWidth + 6));
      if (!scrollable) continue;

      const before = await page.$eval('.carousel', (el) => el.scrollLeft);
      await page.click('.carousel-next');
      await page.waitForTimeout(900);
      const after = await page.$eval('.carousel', (el) => el.scrollLeft);
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
      const cards = await page.$$eval('.card', (els) => els.filter((e) => !e.hidden).length);
      assert.ok(cards > 0, `${p} shows nothing without JS`);
    }
    await ctx.close();
  });
});

describe('accessibility basics', () => {
  test('images have alt attributes and buttons have accessible names', async () => {
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

  test('the mobile menu opens', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    assert.equal(await page.isVisible('.site-nav a'), false, 'nav should start collapsed on mobile');
    await page.click('.nav-toggle');
    await page.waitForTimeout(200);
    assert.equal(await page.isVisible('.site-nav a'), true, 'the hamburger did not open the nav');
    await ctx.close();
  });
});
