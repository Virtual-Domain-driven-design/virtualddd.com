/** Matching one person across two databases.
 *
 * `samePerson` decides whether a session guest is also an organiser — and if it
 * says yes, that guest gets the organiser's portrait and a link to their page.
 * A false positive therefore attributes one real person's face and profile to
 * another, on a public page. That is worth a test of its own, and it had none.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  samePerson, anySamePerson, guestsToName, profileLinks, socialUrl, storyByline,
  organiserFor, paragraphs,
} from '../../src/lib/people.ts';

/** The two rows a person who both organises and speaks has, as the pages see
 *  them. `organiser` on a guest is the organiser entry's id. */
const guest = (name, organiser, rest = {}) => ({ data: { name, organiser, ...rest } });
const org = (id, name, rest = {}) => ({ id, data: { name, ...rest } });

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

describe('pairing a guest row with an organiser row', () => {
  const organisers = [
    org('maxime', 'Maxime'),
    org('kenny-schwegler', 'Kenny Schwegler'),
    org('andrea-magnorsky', 'Andrea Magnorsky'),
  ];

  test('the relation carries the pair the names cannot', () => {
    // The whole reason the relation replaced a name match and a checkbox: this
    // pair is one person, and `samePerson` rejects it on purpose.
    const maxime = guest('Maxime Sanglan-Charlier', 'maxime');
    assert.ok(!samePerson('Maxime Sanglan-Charlier', 'Maxime'));
    assert.equal(organiserFor(maxime, organisers)?.id, 'maxime');
  });

  test('a pair nobody has linked yet still falls back to the name', () => {
    // Every pair, until an editor fills the relation in.
    assert.equal(organiserFor(guest('Kenny Baas-Schwegler'), organisers)?.id, 'kenny-schwegler');
  });

  test('the relation wins over a name that matches somebody else', () => {
    // An editor who linked this row said who it is. Quietly preferring a name
    // match would overrule them, which is the failure mode of guessing.
    const linked = guest('Kenny Schwegler', 'andrea-magnorsky');
    assert.equal(organiserFor(linked, organisers)?.id, 'andrea-magnorsky');
  });

  test('a relation pointing nowhere pairs with nobody rather than guessing', () => {
    // The organiser row was deleted. Falling back to the name here would
    // reinstate exactly the guess the relation exists to replace.
    assert.equal(organiserFor(guest('Kenny Schwegler', 'gone'), organisers), undefined);
  });

  test('an unmatched guest is nobody', () => {
    assert.equal(organiserFor(guest('Nick Tune'), organisers), undefined);
  });

});

describe('a bio as paragraphs', () => {
  test('splits on blank lines and drops the empties', () => {
    assert.deepEqual(paragraphs('One.\n\n  Two.  \n'), ['One.', 'Two.']);
  });

  test('no bio is no paragraphs, not one empty one', () => {
    assert.deepEqual(paragraphs(undefined), []);
    assert.deepEqual(paragraphs('   '), []);
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

  // Guests hold handles and organisers hold URLs, so both reach profileLinks.
  test('turns a guest handle into a link', () => {
    assert.deepEqual(profileLinks({ mastodon: '@sebrose@mastodon.scot' }),
      [{ label: 'Mastodon', href: 'https://mastodon.scot/@sebrose' }]);
    assert.deepEqual(profileLinks({ bluesky: '@vanessaformicola.bsky.social' }),
      [{ label: 'Bluesky', href: 'https://bsky.app/profile/vanessaformicola.bsky.social' }]);
  });

  test('drops a handle it cannot resolve rather than linking nowhere', () => {
    // These would otherwise reach `sameAs`, which is a claim about who
    // someone is, not just a link on a page.
    assert.deepEqual(profileLinks({ mastodon: '@sebrose' }), []);
    assert.deepEqual(profileLinks({ bluesky: '@vanessa' }), []);
  });
});

describe('socialUrl', () => {
  test('leaves a URL alone, so organisers are unaffected', () => {
    assert.equal(socialUrl('mastodon', 'https://mastodon.scot/@sebrose'),
      'https://mastodon.scot/@sebrose');
    assert.equal(socialUrl('bluesky', 'https://bsky.app/profile/kenny.weave-it.org'),
      'https://bsky.app/profile/kenny.weave-it.org');
  });

  test('accepts a handle with or without its leading @', () => {
    assert.equal(socialUrl('mastodon', 'sebrose@mastodon.scot'), 'https://mastodon.scot/@sebrose');
    assert.equal(socialUrl('bluesky', 'kenny.weave-it.org'), 'https://bsky.app/profile/kenny.weave-it.org');
  });

  test('is empty for nothing, whitespace, or a shape it does not know', () => {
    assert.equal(socialUrl('mastodon', undefined), undefined);
    assert.equal(socialUrl('bluesky', '   '), undefined);
    assert.equal(socialUrl('mastodon', '@a@b@c'), undefined);
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
