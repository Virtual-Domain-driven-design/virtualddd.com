/** The two decisions the ddd-crew section makes without asking anyone.
 *
 * Both are invisible until they are wrong: a gallery in the wrong order looks
 * deliberate, and a rewritten link looks fine until someone clicks it. Neither
 * can be demonstrated from the site's own content — the config that exists
 * today has no gaps in it — so the cases below are the specification.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { byGallery, licenceOf, retargetBranch } from '../../src/lib/ddd-crew.ts';

const tool = (over) => ({
  repo: 'x', name: 'X', link: 'https://github.com/ddd-crew/x',
  republished: true, category: 'Getting started', order: 1, ...over,
});

describe('the gallery order', () => {
  const categories = ['Getting started', 'Strategic design'];

  test('categories follow Notion, not the alphabet', () => {
    const out = byGallery({
      categories,
      tools: [tool({ repo: 'b', category: 'Strategic design' }), tool({ repo: 'a' })],
    });
    assert.deepEqual(out.map((t) => t.repo), ['a', 'b']);
  });

  test('a link-out sits among the pages, by its order', () => {
    const out = byGallery({
      categories,
      tools: [
        tool({ repo: 'third', order: 3, republished: false }),
        tool({ repo: 'first', order: 1 }),
        tool({ repo: 'second', order: 2 }),
      ],
    });
    assert.deepEqual(out.map((t) => t.repo), ['first', 'second', 'third']);
  });

  // A category Notion has never heard of means the select was edited after the
  // config was written. It must not vanish, and it must not jump the queue.
  test('an unknown category sorts last rather than disappearing', () => {
    const out = byGallery({
      categories,
      tools: [tool({ repo: 'new', category: 'Team topologies' }), tool({ repo: 'known' })],
    });
    assert.deepEqual(out.map((t) => t.repo), ['known', 'new']);
  });

  test('same category and order falls back to the name, so the order is stable', () => {
    const out = byGallery({
      categories,
      tools: [tool({ repo: 'b', name: 'Beta' }), tool({ repo: 'a', name: 'Alpha' })],
    });
    assert.deepEqual(out.map((t) => t.repo), ['a', 'b']);
  });
});

// The page said CC BY-SA 4.0 for a year because every repo carried it. On
// 2026-08-02 one did not, and the page told the world that somebody's CC BY 4.0
// work came with a ShareAlike obligation. These say the licence is read, never
// assumed.
describe('naming a repository\'s licence', () => {
  test('reads the licence it is given, not the one most repos have', () => {
    assert.equal(licenceOf('CC-BY-4.0').name, 'CC BY 4.0');
    assert.equal(licenceOf('CC-BY-4.0').url, 'https://creativecommons.org/licenses/by/4.0/');
    assert.equal(licenceOf('CC-BY-SA-4.0').name, 'CC BY-SA 4.0');
  });

  test('a licence we hold no name for is null, never a guess', () => {
    assert.equal(licenceOf('EUPL-1.2'), null);
    assert.equal(licenceOf(undefined), null);
    assert.equal(licenceOf(''), null);
  });
});

describe('pointing master links at the branch that exists', () => {
  const md = (s) => retargetBranch(s, 'ddd-crew', 'core-domain-charts', 'main');

  test('rewrites this repo\'s own blob, tree and raw links', () => {
    assert.equal(
      md('[Examples](https://github.com/ddd-crew/core-domain-charts/blob/master/examples)'),
      '[Examples](https://github.com/ddd-crew/core-domain-charts/blob/main/examples)',
    );
    assert.equal(
      md('https://github.com/ddd-crew/core-domain-charts/tree/master/resources'),
      'https://github.com/ddd-crew/core-domain-charts/tree/main/resources',
    );
    assert.equal(
      md('![c](https://raw.githubusercontent.com/ddd-crew/core-domain-charts/master/c.png)'),
      '![c](https://raw.githubusercontent.com/ddd-crew/core-domain-charts/main/c.png)',
    );
  });

  // Another repo may still be on master, and we have not asked it.
  test('leaves another repository alone', () => {
    const link = 'https://github.com/ddd-crew/bounded-context-canvas/blob/master/README.md';
    assert.equal(md(link), link);
  });

  test('leaves a tag or a commit alone, which is the point of a permalink', () => {
    const sha = 'https://github.com/ddd-crew/core-domain-charts/blob/8f2a1c9/examples';
    assert.equal(md(sha), sha);
    const tag = 'https://github.com/ddd-crew/core-domain-charts/blob/v1.1/examples';
    assert.equal(md(tag), tag);
  });

  test('a repo whose default branch really is master is untouched', () => {
    const link = 'https://github.com/ddd-crew/core-domain-charts/blob/master/examples';
    assert.equal(retargetBranch(link, 'ddd-crew', 'core-domain-charts', 'master'), link);
  });

  // "master-plan" is a directory, not the branch, and a blind replace eats it.
  test('does not touch a path that merely starts with the word', () => {
    const link = 'https://github.com/ddd-crew/core-domain-charts/blob/main/master-plan.md';
    assert.equal(md(link), link);
  });
});
