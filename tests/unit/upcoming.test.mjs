/** Which session is "next" — the rule, tested without a browser or a build.
 *
 * The site cannot demonstrate this on its own: it has one upcoming session
 * today, so "picks the second one once the first has been" has no content to
 * prove it against. The rule is proved here and its wiring is proved in
 * tests/browser.test.mjs, which moves the clock past the real session.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SESSION_GRACE_MS, hasFinished, nextUpcomingIndex } from '../../src/lib/upcoming.ts';

const HOUR = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 6, 26, 12, 0, 0);
const at = (hours) => NOW + hours * HOUR;

describe('hasFinished', () => {
  test('a session yet to start has not finished', () => {
    assert.equal(hasFinished(at(1), NOW), false);
  });

  test('a session happening right now has not finished', () => {
    // The visitor who arrives ten minutes late wants this session's join link,
    // not an RSVP for the next one.
    assert.equal(hasFinished(at(-0.5), NOW), false);
  });

  test('a session finishes once the grace period is up', () => {
    assert.equal(hasFinished(NOW - SESSION_GRACE_MS + 1, NOW), false);
    assert.equal(hasFinished(NOW - SESSION_GRACE_MS, NOW), true);
    assert.equal(hasFinished(at(-4), NOW), true);
  });
});

describe('nextUpcomingIndex', () => {
  const three = [at(2), at(24), at(200)];

  test('picks the soonest session', () => {
    assert.equal(nextUpcomingIndex(three, NOW), 0);
  });

  test('picks the second one once the first has been', () => {
    // The defect this replaces: the choice was made at build time, so the home
    // page kept featuring a session that had already happened, with a countdown
    // stuck at "Happening now", until someone rebuilt the site.
    assert.equal(nextUpcomingIndex(three, at(6)), 1);
  });

  test('walks the whole list as time passes', () => {
    assert.equal(nextUpcomingIndex(three, at(26)), 1, 'still in its grace period');
    assert.equal(nextUpcomingIndex(three, at(28)), 2);
    assert.equal(nextUpcomingIndex(three, at(500)), -1);
  });

  test('reports -1 when nothing is upcoming', () => {
    assert.equal(nextUpcomingIndex([], NOW), -1);
    assert.equal(nextUpcomingIndex([at(-10)], NOW), -1);
  });

  test('never picks a session that has been, even if a later one exists', () => {
    for (const now of [at(0), at(3), at(10), at(30), at(199), at(210)]) {
      const i = nextUpcomingIndex(three, now);
      if (i >= 0) assert.equal(hasFinished(three[i], now), false, `picked a finished session at ${now}`);
    }
  });
});
