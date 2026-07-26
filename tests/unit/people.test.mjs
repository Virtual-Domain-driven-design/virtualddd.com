/** Matching one person across two databases.
 *
 * `samePerson` decides whether a session guest is also an organiser — and if it
 * says yes, that guest gets the organiser's portrait and a link to their page.
 * A false positive therefore attributes one real person's face and profile to
 * another, on a public page. That is worth a test of its own, and it had none.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { samePerson, anySamePerson, profileLinks } from '../../src/lib/people.ts';

describe('samePerson', () => {
  test('matches the same name written the same way', () => {
    assert.ok(samePerson('Nick Tune', 'Nick Tune'));
    assert.ok(samePerson('nick tune', 'Nick  Tune'), 'case and spacing should not matter');
  });

  test('matches a surname someone has only half of', () => {
    // The real case this exists for: a session says "Kenny Schwegler" and the
    // organisers database says "Kenny Baas-Schwegler".
    assert.ok(samePerson('Kenny Schwegler', 'Kenny Baas-Schwegler'));
    assert.ok(samePerson('Kenny Baas-Schwegler', 'Kenny Schwegler'), 'and the other way round');
  });

  test('ignores a parenthesised middle name', () => {
    assert.ok(samePerson('Kenny (Baas) Schwegler', 'Kenny Schwegler'));
  });

  test('does not match two different people', () => {
    // Each of these would put the wrong person's photograph on a public page.
    assert.ok(!samePerson('Andrea Magnorsky', 'Andrew Harmel-Law'));
    assert.ok(!samePerson('Chris Simon', 'Chris Richardson'));
    assert.ok(!samePerson('Thomas Ploch', 'Thomas Pierrain'));
    assert.ok(!samePerson('Nick Tune', 'Nick Tunnicliffe'), 'a longer surname is not the same surname');
    assert.ok(!samePerson('Maxime', 'Maxime Sanglan-Charlier'),
      'one name against two is not enough to claim a match — and this pair is real');
  });

  test('a surname that contains another still matches, deliberately', () => {
    // The known cost of the Baas-Schwegler rule: "Chris Simon" and "Chris
    // Simons" would be treated as one person. Nobody on the site is affected,
    // and the alternative — exact surnames only — loses the case this exists
    // for. Pinned here so that tightening the rule is a decision, not a
    // surprise: if you make this stricter, the two-database rejoin stops
    // working for hyphenated names.
    assert.ok(samePerson('Chris Simon', 'Chris Simons'));
  });

  test('is unmoved by empty input', () => {
    assert.ok(!samePerson('', 'Nick Tune'));
    assert.ok(!samePerson('Nick Tune', ''));
    assert.ok(!samePerson('   ', '   '));
  });

  test('anySamePerson looks through a list', () => {
    assert.ok(anySamePerson(['Andrea Magnorsky', 'Kenny Schwegler'], 'Kenny Baas-Schwegler'));
    assert.ok(!anySamePerson(['Andrea Magnorsky'], 'Kenny Baas-Schwegler'));
    assert.ok(!anySamePerson(undefined, 'Kenny Baas-Schwegler'), 'a missing list is not a match');
  });
});

describe('profileLinks', () => {
  test('keeps one order, because the page and `sameAs` both use it', () => {
    const links = profileLinks({
      bluesky: 'https://bsky.app/profile/x',
      website: 'https://example.com',
      linkedin: 'https://linkedin.com/in/x',
    });
    assert.deepEqual(links.map((l) => l.label), ['Website', 'LinkedIn', 'Bluesky']);
  });

  test('leaves out what a person has not given us', () => {
    assert.deepEqual(profileLinks({ website: 'https://example.com' }),
      [{ label: 'Website', href: 'https://example.com' }]);
    assert.deepEqual(profileLinks({}), []);
  });
});
