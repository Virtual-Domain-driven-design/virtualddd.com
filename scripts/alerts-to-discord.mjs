#!/usr/bin/env node
// Turn the alerts that scripts/new-alerts.mjs found into Discord messages.
//
// Reads the new alerts as JSON on stdin, writes one JSON object per line on
// stdout, each ready to POST to a Discord webhook. One line rather than one
// payload because Discord refuses a message over 2000 characters, and a sync
// that renames eight organisers at once produces more than that.
//
// This wording used to live in a code node in the "VirtualDDD site
// notifications" n8n workflow. It lives here now because the alert kinds are
// generated here, in scripts/sync-notion.ts, and a kind added on this side and
// forgotten on the other was a real failure: it is why the unknown-kind block
// at the bottom exists.

const LIMIT = 1900; // Discord's ceiling is 2000; leave room for the run line.

const run = process.env.RUN || '';

const read = () =>
  new Promise((resolve, reject) => {
    let raw = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => { raw += c; });
    process.stdin.on('end', () => resolve(raw));
    process.stdin.on('error', reject);
  });

const list = (rows) =>
  rows.map((i) => `- ${i.title || '(untitled)'} — ${i.url}`).join('\n');

/** The six kinds this file knows how to say out loud, in the order they are
 *  worth reading: things that are wrong on the live site first, then things
 *  that are merely incomplete. */
const KINDS = [
  {
    kind: 'unpublished-but-live',
    heading: '**Unpublished in Notion, but still being served.**',
    intro: (n) =>
      `These ${n} page(s) left the published set without the Retire URL box ticked, so the site keeps answering their addresses:`,
    outro:
      'Tick Retire URL in Notion to take the address down (it will answer 410 Gone), or publish the page again.',
  },
  {
    kind: 'published-without-a-slug',
    heading: '**Published in Notion, but with no slug.**',
    intro: (n) => `These ${n} page(s) have no address, so nothing will ever render them:`,
    outro: 'Fill the slug in and the next sync will publish them.',
  },
  {
    kind: 'image-source-gone',
    heading: '**A picture in Notion is not usable.**',
    intro: () =>
      'Either the source has gone, or what it answers with is not an image at all: a Photo property that *links to* Google Drive returns the viewer page rather than the file, and the sync refuses it. Each line says whether the site still has an older copy to show:',
    outro:
      'Upload the picture into Notion as a file rather than linking to it. The alert clears itself on the next sync.',
  },
  {
    kind: 'unusable-url',
    heading: '**A URL property in Notion is not an address.**',
    intro: () =>
      'Notion’s URL property is a text box and takes anything; the schema that reads it does not. The field was left out so the rest of the site could still ship, which means a link somebody believes is on the page is not there:',
    outro:
      'Put a real address in Notion and the next sync publishes it. A *missing* https:// is not this: the sync assumes it, says so in its own log, and nobody is interrupted.',
  },
  {
    kind: 'person-renamed',
    heading: '**Somebody was renamed in Notion, so their page has moved.**',
    intro: () =>
      'An organiser’s address comes from their name, and unlike a session or a story a person has no Retire URL checkbox, so nothing else would have said this out loud:',
    outro:
      'The redirect from the old address is already recorded and shipped, so nothing 404s. Worth knowing if the old address is written down anywhere outside this site.',
  },
  {
    kind: 'dates-passed',
    heading: '**A conference edition has been and gone.**',
    intro: () =>
      'The card now says no new dates are announced, which is true but is not what anyone wants it to say for long. Only a person can go and find the next edition:',
    outro: 'Update the dates in Notion, or untick Show on site to take the card down.',
  },
];

/** Split one block across as many messages as its list needs, so a long list
 *  is still readable rather than cut off mid-item. The heading is repeated on
 *  a continuation so a message never arrives without saying what it is about. */
function paginate(heading, intro, rows, outro) {
  const messages = [];
  let chunk = [];
  let length = heading.length + intro.length + outro.length + 8;

  const flush = (more) => {
    if (!chunk.length) return;
    const parts = [more ? `${heading} (continued)` : heading];
    if (!more) parts.push(intro);
    parts.push(chunk.join('\n'));
    if (!more) parts.push(outro);
    messages.push(parts.join('\n\n'));
    chunk = [];
    length = heading.length + outro.length + 24;
  };

  for (const row of rows) {
    const line = `- ${row.title || '(untitled)'} — ${row.url}`;
    if (length + line.length > LIMIT) flush(messages.length > 0);
    chunk.push(line);
    length += line.length + 1;
  }
  flush(messages.length > 0);

  // The outro belongs on the last message, not the first, when it split.
  if (messages.length > 1) {
    messages[0] = messages[0].replace(`\n\n${outro}`, '');
    messages[messages.length - 1] += `\n\n${outro}`;
  }
  return messages;
}

const main = async () => {
  let items;
  try {
    items = JSON.parse((await read()).trim() || '[]');
  } catch (e) {
    console.error(`Could not read the alerts as JSON: ${e.message}`);
    process.exit(1);
  }
  if (!Array.isArray(items) || items.length === 0) return;

  const messages = [];

  for (const spec of KINDS) {
    const rows = items.filter((i) => i.kind === spec.kind);
    if (!rows.length) continue;
    messages.push(...paginate(spec.heading, spec.intro(rows.length), rows, spec.outro));
  }

  // Anything this file has not been taught about is still said out loud. A kind
  // added on the sync side and silently dropped here is exactly the failure
  // this whole path exists to prevent, and it has happened once already.
  const known = new Set(KINDS.map((k) => k.kind));
  const rest = items.filter((i) => !known.has(i.kind));
  if (rest.length) {
    const lines = rest.map((i) => `- ${i.kind}: ${i.title || '(untitled)'} — ${i.url}`);
    messages.push(
      [
        `**${rest.length} alert(s) of a kind this script does not know about yet.**`,
        'Somebody added one in the sync; the wording lives in scripts/alerts-to-discord.mjs.',
        lines.join('\n'),
      ].join('\n\n'),
    );
  }

  if (!messages.length) return;

  messages[messages.length - 1] +=
    `\n\nEverything else deployed normally.${run ? `\n${run}` : ''}`;

  for (const content of messages) {
    process.stdout.write(`${JSON.stringify({ content })}\n`);
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
