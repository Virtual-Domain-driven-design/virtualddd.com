/** The structured data, tested where it is decided.
 *
 * `tests/build.test.mjs` checks the shapes that reach `dist/`, which is the
 * promise a search engine sees. This is the other half: the rules that produce
 * them, at the point where they are cheap to change. Between the two, a
 * refactor of `seo.ts` is safe — these say what it must still mean, not how it
 * must be written.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  abs, pageTitle, graph, person, breadcrumbs, trail, topTrail,
  organization, heuristicSet, collectionPage, pageJsonLd,
  sessionJsonLd, storyJsonLd, heuristicJsonLd, SECTIONS,
} from '../../src/lib/seo.ts';

const SITE = new URL('https://virtualddd.com');
const nodesOf = (doc) => doc['@graph'];
const typeOf = (doc, type) => nodesOf(doc).find((n) => n['@type'] === type);

const session = {
  id: 'a-session',
  data: {
    title: 'What is an aggregate',
    datetime: new Date('2026-03-04T18:30:00Z'),
    coOrganisers: [],
    organiser: 'Kenny Baas-Schwegler',
    tags: [],
    level: [],
  },
};

describe('URLs and titles', () => {
  test('absolute URLs, because a meta tag cannot be relative', () => {
    assert.equal(abs(SITE, '/sessions/'), 'https://virtualddd.com/sessions/');
    assert.ok(abs(undefined, '/x/').startsWith('https://virtualddd.com'), 'falls back to the live origin');
  });

  test('a detail page spends its title budget on the topic', () => {
    assert.equal(pageTitle('What is an aggregate'), 'What is an aggregate');
    assert.equal(pageTitle('Heuristics', { brand: true }), 'Heuristics — Virtual DDD');
  });
});

describe('graph', () => {
  test('drops the nodes that turned out not to exist', () => {
    // Every builder passes an optional node positionally; a session with no
    // recording must not ship an empty VideoObject.
    const doc = graph({ '@type': 'A' }, null, undefined, { '@type': 'B' });
    assert.deepEqual(nodesOf(doc).map((n) => n['@type']), ['A', 'B']);
    assert.equal(doc['@context'], 'https://schema.org');
  });
});

describe('person', () => {
  test('a name alone is still worth emitting', () => {
    assert.deepEqual(person({ name: 'Grady Booch' }), { '@type': 'Person', name: 'Grady Booch' });
  });

  test('carries the profiles as sameAs — the reason the field exists', () => {
    const p = person({
      name: 'Seb Rose',
      bio: 'Consultant and author.',
      url: 'https://claysnow.co.uk/',
      sameAs: ['https://claysnow.co.uk/', 'https://mastodon.scot/@sebrose'],
      page: 'https://virtualddd.com/organisers/seb/',
    });
    assert.equal(p.description, 'Consultant and author.');
    assert.deepEqual(p.sameAs, ['https://claysnow.co.uk/', 'https://mastodon.scot/@sebrose']);
    assert.equal(p['@id'], 'https://virtualddd.com/organisers/seb/#person',
      'a person with a page gets a stable id so two pages describe one person');
  });

  test('leaves out what nobody has filled in', () => {
    const p = person({ name: 'X', sameAs: [] });
    assert.ok(!('sameAs' in p), 'an empty sameAs is worse than none');
    assert.ok(!('description' in p));
    assert.ok(!('@id' in p));
  });
});

describe('breadcrumbs', () => {
  test('number the trail from one, with absolute items', () => {
    const b = breadcrumbs(SITE, trail('sessions', 'A session', '/sessions/a/'));
    assert.deepEqual(b.itemListElement.map((i) => [i.position, i.name]),
      [[1, 'Home'], [2, 'Online sessions'], [3, 'A session']]);
    assert.equal(b.itemListElement[2].item, 'https://virtualddd.com/sessions/a/');
  });

  test('a section is named once, so a crumb cannot invent a section', () => {
    for (const [label, path] of Object.values(SECTIONS)) {
      assert.ok(label && path.startsWith('/') && path.endsWith('/'), `${label} → ${path}`);
    }
    assert.deepEqual(topTrail('Heuristics', '/heuristics/'), [['Home', '/'], ['Heuristics', '/heuristics/']]);
  });
});

describe('a session', () => {
  const doc = sessionJsonLd(SITE, session, {
    url: 'https://virtualddd.com/sessions/a-session/',
    isUpcoming: true,
    trail: trail('sessions', 'What is an aggregate', '/sessions/a-session/'),
  });

  test('is an online Event that says when it starts', () => {
    const event = typeOf(doc, 'Event');
    assert.equal(event.eventAttendanceMode, 'https://schema.org/OnlineEventAttendanceMode');
    assert.equal(event.startDate, '2026-03-04T18:30:00.000Z');
    assert.equal(event.location['@type'], 'VirtualLocation');
  });

  test('names whoever was on it, without being told', () => {
    // The page passes enriched performers; with none, the organiser is still
    // named rather than the Event claiming nobody was there.
    assert.deepEqual(typeOf(doc, 'Event').performer, [{ '@type': 'Person', name: 'Kenny Baas-Schwegler' }]);
  });

  test('has no VideoObject until there is a recording', () => {
    assert.equal(typeOf(doc, 'VideoObject'), undefined);
    const withVideo = sessionJsonLd(SITE, { ...session, data: { ...session.data, video: 'https://youtu.be/x' } },
      { url: 'https://virtualddd.com/sessions/a-session/', isUpcoming: false, trail: topTrail('x', '/x/') });
    assert.equal(typeOf(withVideo, 'VideoObject').embedUrl, 'https://youtu.be/x');
  });

  test('only offers a ticket while the session is still ahead', () => {
    const data = { ...session.data, humantix: 'https://tickets.example/x' };
    const opts = { url: 'https://virtualddd.com/sessions/a-session/', trail: topTrail('x', '/x/') };
    assert.ok(typeOf(sessionJsonLd(SITE, { ...session, data }, { ...opts, isUpcoming: true }), 'Event').offers);
    assert.ok(!typeOf(sessionJsonLd(SITE, { ...session, data }, { ...opts, isUpcoming: false }), 'Event').offers,
      'a past session must not advertise tickets');
  });
});

describe('a heuristic', () => {
  const heuristic = {
    id: 'a-heuristic',
    data: { title: 'Keep it private', question: 'How do we lower coupling?', authors: ['Mathias Verraes'], tags: ['coupling'] },
  };
  const url = 'https://virtualddd.com/heuristics/a-heuristic/';
  const doc = heuristicJsonLd(SITE, heuristic, {
    url,
    description: 'An explanation.',
    related: ['https://virtualddd.com/heuristics/another/'],
    discussedIn: [{ name: 'A session', url: 'https://virtualddd.com/sessions/a/' }],
    trail: trail('heuristics', 'Keep it private', '/heuristics/a-heuristic/'),
  });

  test('is a term in the set the index declares', () => {
    const term = typeOf(doc, 'DefinedTerm');
    assert.equal(term.name, 'Keep it private');
    assert.equal(term.inDefinedTermSet['@id'], heuristicSet(SITE)['@id'],
      'a term whose set nobody declares is a dangling reference');
  });

  test('the page points at its own term, and carries the authorship', () => {
    const page = typeOf(doc, 'WebPage');
    assert.equal(page.mainEntity['@id'], typeOf(doc, 'DefinedTerm')['@id']);
    assert.deepEqual(page.author, [{ '@type': 'Person', name: 'Mathias Verraes' }]);
    assert.equal(page.abstract, 'How do we lower coupling?', 'the question is the page summary');
  });

  test('the works that discussed it hang off the term', () => {
    assert.deepEqual(typeOf(doc, 'DefinedTerm').subjectOf,
      [{ '@type': 'CreativeWork', name: 'A session', url: 'https://virtualddd.com/sessions/a/' }]);
    assert.deepEqual(typeOf(doc, 'WebPage').relatedLink, ['https://virtualddd.com/heuristics/another/']);
  });
});

describe('index and standalone pages', () => {
  test('an index lists what it lists, in the order it shows it', () => {
    const doc = collectionPage(SITE, {
      url: 'https://virtualddd.com/sessions/',
      name: 'Online sessions',
      description: 'x',
      items: [{ name: 'B', url: 'https://virtualddd.com/sessions/b/' },
              { name: 'A', url: 'https://virtualddd.com/sessions/a/' }],
      trail: topTrail('Online sessions', '/sessions/'),
    });
    const list = typeOf(doc, 'CollectionPage').mainEntity;
    assert.equal(list.numberOfItems, 2);
    assert.deepEqual(list.itemListElement.map((i) => [i.position, i.name]), [[1, 'B'], [2, 'A']]);
  });

  test('a standalone page still says what it is and where it sits', () => {
    const doc = pageJsonLd(SITE, {
      url: 'https://virtualddd.com/about-us/', name: 'About us', description: 'x',
      trail: topTrail('About us', '/about-us/'),
    });
    assert.ok(typeOf(doc, 'WebPage'));
    assert.ok(typeOf(doc, 'BreadcrumbList'));
    assert.equal(typeOf(doc, 'Organization')['@id'], organization(SITE)['@id']);
  });
});

describe('a story', () => {
  test('is an Article with its authors and its date', () => {
    const doc = storyJsonLd(SITE, {
      id: 's', data: { title: 'A story', authors: ['Andrea Magnorsky'], publishedDate: new Date('2026-01-02') },
    }, { url: 'https://virtualddd.com/facilitating-archdes/s/', trail: topTrail('x', '/x/') });
    const article = typeOf(doc, 'Article');
    assert.equal(article.headline, 'A story');
    assert.deepEqual(article.author, [{ '@type': 'Person', name: 'Andrea Magnorsky' }]);
    assert.equal(article.datePublished, '2026-01-02T00:00:00.000Z');
  });
});
