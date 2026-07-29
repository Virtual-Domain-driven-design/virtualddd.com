/** Matching one person across two databases.
 *
 * `samePerson` decides whether a session guest is also an organiser — and if it
 * says yes, that guest gets the organiser's portrait and a link to their page.
 * A false positive therefore attributes one real person's face and profile to
 * another, on a public page. That is worth a test of its own, and it had none.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { samePerson, anySamePerson, guestsToName, profileLinks, storyByline } from '../../src/lib/people.ts';

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

describe('naming guests on a card', () => {
  // The defect this guards against is a stutter: most session titles end in
  // "… with Nick Tune", and a card that then adds "with Nick Tune" underneath
  // reads as a mistake. 53 of the 67 sessions with guests are in that shape.
  test('says nothing when the title already names everyone', () => {
    assert.deepEqual(
      guestsToName('See the Forest for the Trees - Trond Hjorteland', ['Trond Hjorteland']),
      { shown: [], extra: 0 });
    assert.deepEqual(
      guestsToName('Introducing DDD to your Company with Barry O Sullivan', ["Barry O'Sullivan"]),
      { shown: [], extra: 0 });
  });

  test('names the guest a title leaves out', () => {
    assert.deepEqual(
      guestsToName('Collaborating and Communicating with Wardley Maps', ['Ben Mosior']),
      { shown: ['Ben Mosior'], extra: 0 });
  });

  test('finishes a half-introduction', () => {
    // "a conversation with Rebecca" does not tell a browser which Rebecca.
    assert.deepEqual(
      guestsToName('Critically Engaging with Models a conversation with Rebecca', ['Rebecca Wirfs-Brock']),
      { shown: ['Rebecca Wirfs-Brock'], extra: 0 });
  });

  test('names some of a panel and counts the rest', () => {
    const panel = ['Dawn Ahukanna', 'Nivia Henry', 'Jessica Kerr', 'Ruth Malan', 'Rebecca Wirfs-Brock'];
    assert.deepEqual(guestsToName('Effective team collaboration', panel),
      { shown: ['Dawn Ahukanna', 'Nivia Henry'], extra: 3 });
  });

  test('drops only the guests the title carries, keeping the others', () => {
    assert.deepEqual(
      guestsToName('Design better products with real cross-functional teams - Jutta Eckstein',
        ['Jutta Eckstein', 'Maryse Meinen']),
      { shown: ['Maryse Meinen'], extra: 0 });
  });

  test('a hyphenated surname in the title still counts as named', () => {
    assert.deepEqual(
      guestsToName('Free Trial Workshop with Andrew Harmel-Law', ['Andrew Harmel-Law']),
      { shown: [], extra: 0 });
  });
});

describe('who a story is by', () => {
  // The guest told the story and the hosts asked the questions. One flat list
  // would say neither, and it is the distinction the Guests/Hosts split exists
  // for — see docs/content-model.md.
  test('the guest is the author and the hosts came along', () => {
    assert.deepEqual(
      storyByline(['Michael Joyce'], ['Andrea Magnorsky', 'Andrew Harmel-Law']),
      { by: ['Michael Joyce'], alongside: ['Andrea Magnorsky', 'Andrew Harmel-Law'] });
  });

  test('two guests both keep their billing, in the order Notion holds them', () => {
    // Two episodes in the archive are the same pair the other way round: the
    // one telling the story is first, and that is data, not presentation.
    assert.deepEqual(
      storyByline(['Beija Nigl', 'Michael Plöd'], ['Kenny Schwegler']),
      { by: ['Beija Nigl', 'Michael Plöd'], alongside: ['Kenny Schwegler'] });
  });

  test('an episode with no outside guest is simply by its hosts', () => {
    // Six of the published stories are the hosts talking to each other. Calling
    // them contributors to a story with no author would credit nobody.
    assert.deepEqual(
      storyByline([], ['Andrea Magnorsky', 'Kenny Schwegler']),
      { by: ['Andrea Magnorsky', 'Kenny Schwegler'], alongside: [] });
  });

  test('a story with nobody on it credits nobody, rather than inventing a shape', () => {
    // `Authors` used to stand in here and was retired from Notion on
    // 2026-07-29. An uncurated story is now caught by the content suite, which
    // fails the build on a published story with no author in its JSON-LD.
    assert.deepEqual(storyByline([], []), { by: [], alongside: [] });
  });
});
