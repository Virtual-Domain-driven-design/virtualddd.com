/** The Notion → markdown conversion, tested without touching Notion.
 *
 * This is the integration the whole site rests on: every page under
 * src/content/ is the output of these functions, and a mistake here is
 * invisible until someone reads the page. No network, no fixtures on disk —
 * the block shapes below are what the API actually returns.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createBlocksToMd, isAssetFor, kebab, resolveRelation, richText, statusOf, yamlList, yamlStr,
} from '../../scripts/lib/notion-md.ts';

/** A converter with no network: no children, and images kept as their URL. */
const converter = (over = {}) => createBlocksToMd({
  childrenOf: async () => [],
  downloadImage: async (url) => `./_assets/${url.split('/').pop()}`,
  ...over,
});

const md = (blocks, over) => converter(over).blocksToMd(blocks, { dir: '', slug: 's', count: 0 });

const text = (content, extra = {}) => ({ plain_text: content, annotations: {}, ...extra });
const block = (type, data, extra = {}) => ({ id: `b-${type}`, type, [type]: data, ...extra });
const para = (content) => block('paragraph', { rich_text: [text(content)] });

describe('rich text', () => {
  test('carries annotations', () => {
    assert.equal(richText([text('bold', { annotations: { bold: true } })]), '**bold**');
    assert.equal(richText([text('it', { annotations: { italic: true } })]), '*it*');
    assert.equal(richText([text('x', { annotations: { code: true } })]), '`x`');
    assert.equal(richText([text('no', { annotations: { strikethrough: true } })]), '~~no~~');
  });

  test('keeps a real link', () => {
    assert.equal(
      richText([text('the docs', { href: 'https://example.com/a' })]),
      '[the docs](https://example.com/a)',
    );
  });

  test('drops a link to a bare Notion page id, keeping the words', () => {
    // A Notion mention renders as /e342ff0d… — a dead link on this site. One
    // shipped in a session body before this rule existed.
    const id = 'e342ff0d1c2b4a5d6e7f8091a2b3c4d5';
    assert.equal(richText([text('see this', { href: `/${id}` })]), 'see this');
    assert.equal(richText([text('see this', { href: id })]), 'see this');
  });

  test('promotes a page-id link whose text is itself a URL', () => {
    const id = 'e342ff0d1c2b4a5d6e7f8091a2b3c4d5';
    assert.equal(
      richText([text('https://virtualddd.com/x/', { href: `/${id}` })]),
      '[https://virtualddd.com/x/](https://virtualddd.com/x/)',
    );
  });

  test('concatenates runs without inventing whitespace', () => {
    // The sync must not paper over a missing space in Notion: that is an
    // editorial fix, and inserting one here would hide it.
    assert.equal(richText([text('finding the'), text('theory', { href: 'https://x.test' })]),
      'finding the[theory](https://x.test)');
  });
});

describe('blocks to markdown', () => {
  test('moves the shallowest heading to h2, keeping the rest relative', async () => {
    // The page title is the h1, so a body never has one. But demoting *every*
    // heading by one was only right for a body that opens with heading_1: an
    // author who opens with heading_2 got a page whose first heading was an
    // h3, and 160 heuristics shipped that way.
    const h = (n, s) => block(`heading_${n}`, { rich_text: [text(s)] });

    // Opens at heading_1: unchanged from the old behaviour.
    assert.equal(await md([h(1, 'One'), h(2, 'Two'), h(3, 'Three')]),
      '## One\n\n### Two\n\n#### Three');

    // Opens at heading_2: already correct, so nothing moves.
    assert.equal(await md([h(2, 'Two'), h(3, 'Three')]), '## Two\n\n### Three');

    // Opens at heading_3: promoted, and the relative structure is kept.
    assert.equal(await md([h(3, 'A'), h(3, 'B')]), '## A\n\n## B');

    // Depth is judged over the whole document, not the first heading seen.
    assert.equal(await md([h(3, 'Deep'), h(2, 'Shallow')]), '### Deep\n\n## Shallow');
  });

  test('never emits an h1 from a body', async () => {
    for (const n of [1, 2, 3]) {
      const out = await md([block(`heading_${n}`, { rich_text: [text('x')] })]);
      assert.doesNotMatch(out, /^# /m, `heading_${n} became an h1`);
    }
  });

  test('numbers ordered lists and restarts after other content', async () => {
    const item = (s) => block('numbered_list_item', { rich_text: [text(s)] });
    const out = await md([item('a'), item('b'), para('gap'), item('c')]);
    assert.match(out, /1\. a/);
    assert.match(out, /2\. b/);
    assert.match(out, /1\. c/, 'numbering should restart after a paragraph');
  });

  test('renders to-dos, quotes, callouts, code and dividers', async () => {
    const out = await md([
      block('to_do', { rich_text: [text('done')], checked: true }),
      block('to_do', { rich_text: [text('open')], checked: false }),
      block('quote', { rich_text: [text('quoted')] }),
      block('callout', { rich_text: [text('note')], icon: { emoji: '💡' } }),
      block('code', { rich_text: [text('const a = 1;')], language: 'ts' }),
      block('divider', {}),
    ]);
    assert.match(out, /- \[x\] done/);
    assert.match(out, /- \[ \] open/);
    assert.match(out, /> quoted/);
    assert.match(out, /> 💡 note/);
    assert.match(out, /```ts\nconst a = 1;\n```/);
    assert.match(out, /^---$/m);
  });

  test('indents nested list items', async () => {
    const child = block('bulleted_list_item', { rich_text: [text('inner')] });
    const parent = { ...block('bulleted_list_item', { rich_text: [text('outer')] }), has_children: true };
    const out = await md([parent], { childrenOf: async () => [child] });
    assert.match(out, /- outer/);
    assert.match(out, /^ {2}- inner/m);
  });

  test('stores images locally rather than linking Notion, which expires', async () => {
    const img = block('image', {
      type: 'file',
      file: { url: 'https://notion.example/signed/pic.png?expires=soon' },
      caption: [text('a caption')],
    });
    assert.equal(await md([img]), '![a caption](./_assets/pic.png?expires=soon)');
  });

  test('drops an image the downloader could not store', async () => {
    const img = block('image', { type: 'file', file: { url: 'https://notion.example/x.png' }, caption: [] });
    assert.equal(await md([img], { downloadImage: async () => null }), '');
  });

  test('keeps embeds and bookmarks as links', async () => {
    for (const t of ['video', 'embed', 'bookmark', 'link_preview']) {
      assert.equal(await md([block(t, { url: 'https://youtu.be/abc' })]),
        '[https://youtu.be/abc](https://youtu.be/abc)');
    }
  });

  test('renders a table with a header row and escaped pipes', async () => {
    const row = (cells) => block('table_row', { cells: cells.map((c) => [text(c)]) });
    const table = { ...block('table', {}), has_children: true };
    const out = await md([table], {
      childrenOf: async () => [row(['a', 'b']), row(['pipe | here', 'd'])],
    });
    assert.equal(out, '| a | b |\n| --- | --- |\n| pipe \\| here | d |');
  });

  test('reports an unknown block type instead of dropping it silently', async () => {
    const c = converter();
    const out = await c.blocksToMd([block('synced_block', {})], null);
    assert.match(out, /<!-- TODO block: synced_block -->/);
    assert.deepEqual([...c.seenUnhandled], ['synced_block'], 'the sync should be able to report it');
  });
});

describe('frontmatter encoding', () => {
  test('escapes quotes and backslashes', () => {
    assert.equal(yamlStr('a "quoted" title'), '"a \\"quoted\\" title"');
    assert.equal(yamlStr('back\\slash'), '"back\\\\slash"');
    assert.equal(yamlStr(undefined), '""');
  });

  test('writes lists inline', () => {
    assert.equal(yamlList(['a', 'b']), '["a", "b"]');
    assert.equal(yamlList([]), '[]');
  });
});

describe('Notion property reading', () => {
  test('reads both of Notion\'s status types', () => {
    // Sessions use a select, the other three use a status. Getting this wrong
    // silently publishes nothing.
    assert.equal(statusOf({ properties: { Status: { select: { name: 'Done' } } } }, 'select'), 'Done');
    assert.equal(statusOf({ properties: { Status: { status: { name: 'Published' } } } }, 'status'), 'Published');
    assert.equal(statusOf({ properties: { Status: { select: { name: 'Done' } } } }, 'status'), '');
    assert.equal(statusOf({ properties: {} }, 'status'), '');
  });

  test('kebabs a name into an entry id', () => {
    assert.equal(kebab('Rebecca Wirfs-Brock'), 'rebecca-wirfs-brock');
    assert.equal(kebab('  Trailing --- dashes  '), 'trailing-dashes');
    // A guest entry is named after the person; dropping the accent instead of
    // folding it turned Gáspár Nagy into `g-sp-r-nagy`.
    assert.equal(kebab('Gáspár Nagy'), 'gaspar-nagy');
    assert.equal(kebab('Emilio Carrión'), 'emilio-carrion');
    assert.equal(kebab('Michael Plöd'), 'michael-plod');
  });
});

describe('relation gating', () => {
  const published = new Map([['id-live', 'a-published-heuristic']]);
  const unpublished = new Map([['id-curating', { title: 'Half-written', status: 'Curating' }]]);

  test('resolves a published heuristic to its slug', () => {
    assert.deepEqual(resolveRelation('id-live', published, unpublished),
      { kind: 'resolved', slug: 'a-published-heuristic' });
  });

  test('reports one still being curated as pending, not as an error', () => {
    // Editorial work in progress. It must not fail a build, or publishing
    // anything becomes hostage to an unfinished heuristic.
    assert.deepEqual(resolveRelation('id-curating', published, unpublished),
      { kind: 'pending', title: 'Half-written', status: 'Curating' });
  });

  test('reports a relation to a page that does not exist as dangling', () => {
    assert.deepEqual(resolveRelation('id-deleted', published, unpublished), { kind: 'dangling' });
  });
});

describe('recognising an asset a previous sync stored', () => {
  // What this guards: when an image source stops answering, the sync keeps the
  // copy it already has instead of dropping the picture. Handing back the
  // *wrong* file would be worse than dropping it, so the match is exact but
  // for the extension.
  test('matches the asset for that slug and label, whatever the extension', () => {
    assert.ok(isAssetFor('marco-heimeshoff-photo.jpg', 'marco-heimeshoff', 'photo'));
    assert.ok(isAssetFor('andrew-harmel-law-photo.png', 'andrew-harmel-law', 'photo'));
    assert.ok(isAssetFor('a-session-featured.webp', 'a-session', 'featured'));
  });

  test('a longer label does not answer for a shorter one', () => {
    // body-1 and body-11 sit in the same directory for any page with more
    // than ten pictures in it.
    assert.ok(isAssetFor('a-story-body-1.jpg', 'a-story', 'body-1'));
    assert.equal(isAssetFor('a-story-body-11.jpg', 'a-story', 'body-1'), false);
  });

  test('a slug does not lend its picture to a slug it is a prefix of', () => {
    assert.equal(isAssetFor('kenny-baas-schwegler-photo.jpg', 'kenny-baas', 'photo'), false);
  });

  test('another label of the same entry is not a match', () => {
    assert.equal(isAssetFor('a-session-featured.webp', 'a-session', 'photo'), false);
  });
});
