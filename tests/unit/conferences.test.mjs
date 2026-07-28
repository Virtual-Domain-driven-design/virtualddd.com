/** Where a conference sits in the row, and how its dates read.
 *
 * The site cannot demonstrate this on its own: all four conferences in Notion
 * are in the future today, so "an edition that has been sinks to the end" has
 * no content to prove it against, and will not have until September 2026. The
 * rule is proved here and its wiring is proved in tests/browser.test.mjs,
 * which moves the browser clock past the first one.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { endOfRun, hasPassed, orderConferences } from '../../src/lib/conferences.ts';
import { dateRange } from '../../src/lib/dates.ts';

const day = (y, m, d) => Date.UTC(y, m - 1, d);
const DAY = 24 * 60 * 60 * 1000;

describe('endOfRun', () => {
  test('a conference is over at the end of its last day, not the start', () => {
    // Notion hands us whole days, so the last day parses to its midnight.
    // Treating that as the end would call a conference finished while the
    // closing keynote is still running.
    assert.equal(endOfRun(day(2026, 9, 21), day(2026, 9, 25)), day(2026, 9, 25) + DAY);
  });

  test('a one-day camp with no end date still gets its whole day', () => {
    assert.equal(endOfRun(day(2027, 5, 3)), day(2027, 5, 3) + DAY);
  });
});

describe('hasPassed', () => {
  const start = day(2026, 9, 21);
  const end = day(2026, 9, 25);

  test('is false before it starts', () => {
    assert.equal(hasPassed(start, end, day(2026, 9, 1)), false);
  });

  test('is false while it is running, including on the final day', () => {
    assert.equal(hasPassed(start, end, day(2026, 9, 23)), false);
    assert.equal(hasPassed(start, end, end + 23 * 60 * 60 * 1000), false);
  });

  test('is true once the last day is over', () => {
    assert.equal(hasPassed(start, end, end + DAY), true);
    assert.equal(hasPassed(start, end, day(2026, 10, 1)), true);
  });
});

describe('orderConferences', () => {
  const explore = { name: 'Explore DDD', startMs: day(2026, 9, 21), endMs: day(2026, 9, 25) };
  const kan = { name: 'KanDDDinsky', startMs: day(2026, 10, 14), endMs: day(2026, 10, 16) };
  const como = { name: 'CoMoCamp', startMs: day(2027, 5, 3), endMs: day(2027, 5, 6) };
  const dddeu = { name: 'DDD Europe', startMs: day(2027, 6, 1), endMs: day(2027, 6, 4) };
  const all = [dddeu, explore, como, kan];
  const names = (rows) => rows.map((r) => r.name);

  test('soonest first', () => {
    assert.deepEqual(
      names(orderConferences(all, day(2026, 7, 28))),
      ['Explore DDD', 'KanDDDinsky', 'CoMoCamp', 'DDD Europe'],
    );
  });

  test('an edition that has been sinks to the end, and the rest close up', () => {
    assert.deepEqual(
      names(orderConferences(all, day(2026, 10, 1))),
      ['KanDDDinsky', 'CoMoCamp', 'DDD Europe', 'Explore DDD'],
    );
  });

  test('several stale ones sit most recent first, nearest the live ones', () => {
    // The one that just finished is the one most likely to have new dates
    // announced next, so it should not be behind a two-year-old edition.
    assert.deepEqual(
      names(orderConferences(all, day(2026, 11, 1))),
      ['CoMoCamp', 'DDD Europe', 'KanDDDinsky', 'Explore DDD'],
    );
  });

  test('nothing is ever dropped, even when every edition has been', () => {
    // The row stays full on purpose: a conference whose next edition is not
    // announced has not gone anywhere, and a gap says less than a card saying
    // so. Four in, four out.
    assert.equal(orderConferences(all, day(2030, 1, 1)).length, 4);
  });

  test('does not mutate what it is given', () => {
    const input = [dddeu, explore];
    orderConferences(input, day(2026, 7, 28));
    assert.deepEqual(names(input), ['DDD Europe', 'Explore DDD']);
  });
});

describe('dateRange', () => {
  test('says the month and year once when both ends share them', () => {
    assert.equal(dateRange(new Date(day(2026, 9, 21)), new Date(day(2026, 9, 25))), '21–25 Sept 2026');
  });

  test('repeats the month across a month boundary', () => {
    assert.equal(dateRange(new Date(day(2027, 5, 30)), new Date(day(2027, 6, 2))), '30 May – 2 Jun 2027');
  });

  test('spells both out across a year boundary', () => {
    assert.equal(
      dateRange(new Date(day(2026, 12, 28)), new Date(day(2027, 1, 2))),
      '28 Dec 2026 – 2 Jan 2027',
    );
  });

  test('a single day is a single date, not a range of one', () => {
    assert.equal(dateRange(new Date(day(2027, 5, 3))), '3 May 2027');
    assert.equal(dateRange(new Date(day(2027, 5, 3)), new Date(day(2027, 5, 3))), '3 May 2027');
  });
});
