/** Noticing that Notion stopped being shaped the way the sync reads it.
 *
 * Every case here is a real incident from the first week of August 2026, and
 * every one of them deployed green at the time. A rename or a retype makes the
 * read return nothing, every field the sync writes is optional, so the run
 * writes the record without it and commits. This is the check that makes that
 * loud, so these tests are the record of what "loud enough" means.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { schemaWatch, driftAlerts } from '../../scripts/lib/schema-drift.ts';

/** A property as Notion sends it back on a page. */
const prop = (type) => ({ type, [type]: null });

describe('schemaWatch', () => {
  test('says nothing when every read finds what it expected', () => {
    const w = schemaWatch();
    for (let i = 0; i < 3; i += 1) {
      w.note('Slug', 'rich_text', prop('rich_text'));
      w.note('Guests', 'relation', prop('relation'));
    }
    assert.deepEqual(w.drift(), []);
  });

  test('a property no row has at all is a rename or a deletion', () => {
    // 2026-08-04: the Guests database renamed LinkedIn to LinkedIn Url. The
    // sync kept asking for the old name and wrote 13 guests without it.
    const w = schemaWatch();
    for (let i = 0; i < 5; i += 1) w.note('LinkedIn', 'url', undefined);
    assert.deepEqual(w.drift(), [{ name: 'LinkedIn', expected: 'url' }]);
  });

  test('a property that changed type is reported with both types', () => {
    // 2026-08-01: Mastodon went from URL to text while the reader still asked
    // for `h.url`, so every organiser and guest file lost the field.
    const w = schemaWatch();
    for (let i = 0; i < 5; i += 1) w.note('Mastodon', 'url', prop('rich_text'));
    assert.deepEqual(w.drift(), [{ name: 'Mastodon', expected: 'url', actual: 'rich_text' }]);
  });

  test('one empty row is not drift', () => {
    // The distinction the whole check rests on. A guest with no Bluesky handle
    // is ordinary; a database where nobody has one is a name only we believe in.
    const w = schemaWatch();
    w.note('Bluesky Tag', 'rich_text', undefined);
    w.note('Bluesky Tag', 'rich_text', prop('rich_text'));
    w.note('Bluesky Tag', 'rich_text', undefined);
    assert.deepEqual(w.drift(), []);
  });

  test('an unticked checkbox is never reported', () => {
    // Notion does not send a checkbox that has never been ticked, so absence
    // says nothing about the schema. Without this carve-out, Retire URL on a
    // database where nobody has retired anything is an alert on every run.
    const w = schemaWatch();
    for (let i = 0; i < 4; i += 1) w.note('Retire URL', 'checkbox', undefined);
    assert.deepEqual(w.drift(), []);
  });

  test('a mixture of types is left alone rather than guessed at', () => {
    // A schema change cannot produce a mix. Something else is going on, and
    // inventing an interpretation of it would be worse than staying quiet.
    const w = schemaWatch();
    w.note('Odd', 'url', prop('rich_text'));
    w.note('Odd', 'url', prop('url'));
    assert.deepEqual(w.drift(), []);
  });

  test('reports every drifted property, in a stable order', () => {
    // The file this ends up in is committed and diffed to decide whether an
    // alert is new, so an unstable order would raise the same alert for ever.
    const w = schemaWatch();
    w.note('Mastodon', 'url', undefined);
    w.note('Bluesky', 'url', undefined);
    w.note('LinkedIn', 'url', undefined);
    assert.deepEqual(w.drift().map((d) => d.name), ['Bluesky', 'LinkedIn', 'Mastodon']);
  });
});

describe('driftAlerts', () => {
  const sample = 'https://notion.so/a-guest-row';

  test('a missing property reads as a missing property', () => {
    const [a] = driftAlerts('/sessions/', sample, [{ name: 'LinkedIn', expected: 'url' }]);
    assert.equal(a.kind, 'notion-schema-drift');
    assert.equal(a.section, '/sessions/');
    assert.equal(a.url, sample);
    assert.match(a.title, /^LinkedIn is read by the sync, but the database has no such property$/);
  });

  test('a retyped property names both types, so the fix is obvious', () => {
    const [a] = driftAlerts('/sessions/', sample, [
      { name: 'Mastodon', expected: 'url', actual: 'rich_text' },
    ]);
    assert.equal(a.title, 'Mastodon is read as url, but Notion now says rich_text');
  });

  test('no drift, no alerts', () => {
    assert.deepEqual(driftAlerts('/sessions/', sample, []), []);
  });
});
