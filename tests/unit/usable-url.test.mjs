/** What the sync publishes for a URL property Notion holds as free text.
 *
 * Two real incidents are in here. Both were a guest's Website typed without a
 * scheme, both stopped the deploy at its first step, and the second one kept
 * the site two days behind Notion. Nothing on the site was wrong; nothing new
 * could reach it.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { usableUrl } from '../../scripts/lib/usable-url.ts';

describe('usableUrl', () => {
  test('an address that is already an address is published untouched', () => {
    // Untouched matters as much as valid: `new URL(v).href` would return
    // "https://example.com/" and rewrite every content file that has a bare
    // origin in it, for a diff nobody could explain.
    for (const v of ['https://example.com', 'http://a.b/c?d=e#f', 'https://x.com/a/']) {
      assert.deepEqual(usableUrl(v), { url: v });
    }
  });

  test('a missing scheme is a typing convention, not an ambiguity', () => {
    // 2026-08-08: the Website of a session guest, typed the way anybody says a
    // domain out loud. It cost two days of releases.
    assert.deepEqual(usableUrl('trainitek.com'), {
      url: 'https://trainitek.com', raw: 'trainitek.com', problem: 'repaired',
    });
    assert.deepEqual(usableUrl('www.example.com/talks'), {
      url: 'https://www.example.com/talks', raw: 'www.example.com/talks', problem: 'repaired',
    });
  });

  test('a bare word is not an address, however well https:// glues on', () => {
    // `https://nodot` parses, and points at a machine that does not exist.
    // Publishing a link that goes nowhere is worse than publishing no link.
    assert.deepEqual(usableUrl('nodot'), { raw: 'nodot', problem: 'unusable' });
    assert.deepEqual(usableUrl('ask Kenny'), { raw: 'ask Kenny', problem: 'unusable' });
  });

  test('nothing at all is not a problem, it is just nothing', () => {
    // Every one of these fields is optional. A guest without a website is
    // ordinary, and must never reach Discord as though somebody broke it.
    for (const v of [undefined, null, '', '   ']) {
      assert.deepEqual(usableUrl(v), {});
    }
  });

  test('whitespace around an address is trimmed rather than reported', () => {
    assert.deepEqual(usableUrl('  https://example.com  '), { url: 'https://example.com' });
  });

  test('a scheme that is not http is left exactly alone', () => {
    // The schemas say z.url(), which accepts these. It is not this function's
    // job to have an opinion the schema does not have.
    assert.deepEqual(usableUrl('mailto:hello@virtualddd.com'), { url: 'mailto:hello@virtualddd.com' });
  });

  test('whatever it publishes, the schema that reads it accepts', () => {
    // The invariant the whole file exists for, held against the real z.url()
    // rather than against a comment about it. If a Zod upgrade ever makes the
    // schema stricter than `new URL()`, this is what says so — here, rather
    // than in a red deploy at three in the morning.
    const schema = z.url();
    const inputs = [
      'https://example.com', 'trainitek.com', 'www.example.com', 'nodot', 'ask Kenny',
      '', '   ', undefined, null, 'mailto:a@b.com', 'ftp://x.com', '//example.com',
      'example.com/a b', 'HTTPS://EXAMPLE.COM', 'example.com:8080/x', '例え.jp',
    ];
    for (const v of inputs) {
      const { url } = usableUrl(v);
      if (url === undefined) continue;
      assert.ok(schema.safeParse(url).success, `usableUrl(${JSON.stringify(v)}) published ${url}, which z.url() rejects`);
    }
  });
});
