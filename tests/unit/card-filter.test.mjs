/** Which cards a filter leaves showing.
 *
 * This rule used to exist three times, in three page scripts, and the three had
 * already drifted apart. It is now one function, and this is where its
 * behaviour is decided — testing it through a browser is slower and says less.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { matchesCard, packFacet, countLabel } from '../../src/lib/card-filter.ts';

const card = (over = {}) => ({
  search: 'eventstorming with alberto brandolini collaborative modelling',
  tags: 'eventstorming|collaborative modelling',
  level: 'beginner|intermediate',
  type: 'hands-on',
  ...over,
});

describe('matchesCard', () => {
  test('an empty filter matches everything', () => {
    assert.ok(matchesCard(card(), {}));
    assert.ok(matchesCard(card(), { term: '', facets: { tags: '', type: '' } }));
    assert.ok(matchesCard({}, {}), 'even a card carrying no data at all');
  });

  test('the search box looks through one prepared haystack', () => {
    assert.ok(matchesCard(card(), { term: 'alberto' }), 'the host is searchable');
    assert.ok(matchesCard(card(), { term: 'EVENTSTORMING' }), 'case does not matter');
    assert.ok(matchesCard(card(), { term: '  brandolini  ' }), 'nor does stray whitespace');
    assert.ok(!matchesCard(card(), { term: 'kubernetes' }));
  });

  test('a facet matches a whole value, never part of one', () => {
    // The bug this prevents: substring matching made "design" match both
    // "design-heuristics" and "guiding-heuristics".
    assert.ok(matchesCard({ type: 'design-heuristics' }, { facets: { type: 'design-heuristics' } }));
    assert.ok(!matchesCard({ type: 'guiding-heuristics' }, { facets: { type: 'design' } }));
    assert.ok(!matchesCard({ type: 'guiding-heuristics' }, { facets: { type: 'heuristics' } }));
  });

  test('a multi-word value stays one value', () => {
    assert.ok(matchesCard(card(), { facets: { tags: 'collaborative modelling' } }));
    assert.ok(!matchesCard(card(), { facets: { tags: 'modelling' } }),
      'half a tag is not the tag');
  });

  test('filters combine — all of them must hold', () => {
    assert.ok(matchesCard(card(), { term: 'alberto', facets: { tags: 'eventstorming', level: 'beginner' } }));
    assert.ok(!matchesCard(card(), { term: 'alberto', facets: { tags: 'eventstorming', level: 'advanced' } }));
  });

  test('a card missing the facet drops out rather than slipping through', () => {
    assert.ok(!matchesCard({ search: 'x' }, { facets: { tags: 'eventstorming' } }));
  });
});

describe('packFacet', () => {
  test('joins values so each stays whole, lower case', () => {
    assert.equal(packFacet(['EventStorming', 'Collaborative Modelling']),
      'eventstorming|collaborative modelling');
  });

  test('drops the empties, so an absent value is not a value', () => {
    assert.equal(packFacet(['', '  ']), '');
    assert.equal(packFacet([]), '');
    // A session with no type would otherwise carry `data-type="|"`.
    assert.ok(!matchesCard({ type: packFacet(['']) }, { facets: { type: 'talk' } }));
  });
});

describe('countLabel', () => {
  test('says the noun the way a person would', () => {
    assert.equal(countLabel(0, { one: 'session', many: 'sessions' }), '0 sessions');
    assert.equal(countLabel(1, { one: 'session', many: 'sessions' }), '1 session');
    assert.equal(countLabel(12, { one: 'story', many: 'stories' }), '12 stories');
  });
});
