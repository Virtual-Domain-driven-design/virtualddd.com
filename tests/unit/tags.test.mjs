/** The one spelling of a tag.
 *
 * Every case here is a pair that really existed in Notion, because the point of
 * the rule is the merges it produces, not the transformation in the abstract.
 * See src/lib/tags.ts for why this lives in the sync rather than in Notion.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { normaliseTag, normaliseTags } from '../../src/lib/tags.ts';

/** Both spellings must land on the same tag — that is the whole job. */
const merges = (a, b, expected) => {
  assert.equal(normaliseTag(a), expected, `${JSON.stringify(a)} should normalise to ${expected}`);
  assert.equal(normaliseTag(b), expected, `${JSON.stringify(b)} should normalise to ${expected}`);
};

describe('one spelling per tag', () => {
  test('case is not a distinction', () => {
    // 21 uses each, in two different databases, offered as two filter options.
    merges('Strategic design', 'strategic design', 'strategic design');
    merges('EventStorming', 'eventstorming', 'eventstorming');
    merges('Sociotechnical Systems', 'sociotechnical systems', 'sociotechnical systems');
    merges('CQRS', 'cqrs', 'cqrs');
  });

  test('a slug-style hyphen becomes a space', () => {
    merges('Psychological Safety', 'psychological-safety', 'psychological safety');
    merges('Team Dynamics', 'team-dynamics', 'team dynamics');
    merges('workshop facilitation', 'workshop-facilitation', 'workshop facilitation');
    merges('Distributed systems', 'distributed-systems', 'distributed systems');
  });

  test('a hyphen English wants is kept, and added', () => {
    // Both directions: the flattening pass would otherwise leave these as two.
    merges('decision-making', 'Decision Making', 'decision-making');
    merges('Event-Driven Architecture', 'event driven architecture', 'event-driven architecture');
    merges('cross functional', 'cross-functional', 'cross-functional');
    assert.equal(normaliseTag('socio-technical'), 'socio-technical');
    assert.equal(normaliseTag('Decentralised Decision-Making'), 'decentralised decision-making');
    assert.equal(normaliseTag('domain-driven-design'), 'domain-driven design');
  });

  test('British spelling, one way', () => {
    merges('Collaborative Modeling', 'collaborative modelling', 'collaborative modelling');
    merges('software modeling', 'software modelling', 'software modelling');
    merges('Legacy Modernization', 'legacy-modernisation', 'legacy modernisation');
    merges('organizational-change', 'organisational change', 'organisational change');
    // The plural is its own case: \bization\b cannot see the trailing s.
    merges('teams and organizations', 'teams and organisations', 'teams and organisations');
  });

  test('the typos that were really in there', () => {
    assert.equal(normaliseTag('architecte decisions'), 'architect decisions');
    assert.equal(normaliseTag('event sroucing'), 'event sourcing');
    assert.equal(normaliseTag('walktrough'), 'walkthrough');
    assert.equal(normaliseTag('Engineering CUlture'), 'engineering culture');
    assert.equal(normaliseTag('collaborate modelling'), 'collaborative modelling');
  });

  test('leaves a tag that is already right alone', () => {
    for (const t of ['bounded context', 'ux', 'adr', 'systems thinking', 'hands-on']) {
      assert.equal(normaliseTag(t), t, `${t} should be left as it is`);
    }
  });

  test('is idempotent, or the next sync would keep changing its mind', () => {
    for (const t of ['Psychological Safety', 'Decision Making', 'Collaborative Modeling',
      'domain-driven-design', 'cross functional', 'Legacy Modernization']) {
      assert.equal(normaliseTag(normaliseTag(t)), normaliseTag(t), `${t} is not stable`);
    }
  });

  test('a page carrying both spellings ends up with one chip', () => {
    assert.deepEqual(
      normaliseTags(['Collaborative Modeling', 'collaborative modelling', 'EventStorming']),
      ['collaborative modelling', 'eventstorming'],
    );
    assert.deepEqual(normaliseTags([]), []);
    assert.deepEqual(normaliseTags(['  ', 'UX']), ['ux']);
  });
});
