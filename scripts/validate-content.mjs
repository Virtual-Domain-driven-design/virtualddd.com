/** Refuse to commit content the build will refuse, one row at a time.
 *
 * The sync gates every field it knows how to gate: `usableUrl` for addresses,
 * `requires` for a property the schema demands. This is the backstop for the
 * ones nobody has thought of yet, and the reason it exists is that the failure
 * is never proportionate to the mistake. `astro check` is the deploy's first
 * step, so *one* row Notion holds badly stops the entire site publishing: on
 * 2026-08-03 twelve consecutive deploys failed overnight over one guest's
 * Website, and on 2026-08-08 the site went two days and eight commits without a
 * release while every page on it was fine.
 *
 * So: run the real validator against what the sync just wrote, and for any
 * entry it rejects, put that one file back the way it was and carry on. The
 * page keeps the content of the last good sync, everything else publishes, and
 * the row goes to Discord as an alert for the person who can actually fix it.
 *
 * `astro sync` rather than `astro check`, because only the content layer is
 * being asked about here and the type diagnostics are the deploy's business.
 *
 * The validator is Astro's own, not a copy of the schemas. A second copy is a
 * copy that drifts, and the thing worth being sure of is precisely that this
 * agrees with the build.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const CONFIG = 'src/content.config.ts';
const ALERTS = 'data/sync-alerts.json';
const ROUNDS = 6;

/** Where each collection keeps its files, read from the config rather than
 *  listed here, so adding a collection needs no edit in this file. The
 *  collection name in Astro's error is the const name (`sessionGuests`); the
 *  directory is not (`session-guests`), which is exactly why this is parsed. */
function collectionDirs() {
  const src = readFileSync(CONFIG, 'utf8');
  const re = /const\s+(\w+)\s*=\s*defineCollection\(\{[\s\S]*?glob\(\{\s*pattern:\s*'([^']+)'\s*,\s*base:\s*'\.\/([^']+)'/g;
  const out = {};
  for (const [, name, pattern, base] of src.matchAll(re)) {
    out[name] = { dir: base, ext: pattern.slice(pattern.lastIndexOf('.')) };
  }
  return out;
}

const run = (cmd, args) => {
  try {
    return { code: 0, out: execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
};

const tracked = (path) => run('git', ['cat-file', '-e', `HEAD:${path}`]).code === 0;

function appendAlerts(added) {
  if (!added.length) return;
  let doc = { items: [] };
  try { doc = JSON.parse(readFileSync(ALERTS, 'utf8')); } catch { /* first alert of all */ }
  if (!Array.isArray(doc.items)) doc.items = [];
  // Keyed the same way a reader would: the same row rejected twice in one run
  // is one thing to fix, not two.
  const seen = new Set(doc.items.map((i) => `${i.kind}|${i.title}`));
  for (const a of added) if (!seen.has(`${a.kind}|${a.title}`)) { doc.items.push(a); seen.add(`${a.kind}|${a.title}`); }
  writeFileSync(ALERTS, `${JSON.stringify(doc, null, 2)}\n`);
}

const dirs = collectionDirs();
/** Keyed by row, not appended, so a row that is restored and then rejected
 *  again says only what finally happened to it. Two alerts for one row read
 *  as two problems, and the first would contradict the second. */
const alerts = new Map();
/** What has already been put back once. A restored file that is rejected again
 *  means the bad data is in the commit too, so there is nothing good to go back
 *  to and the entry has to go. Without this the loop would restore and re-read
 *  the same file until it ran out of rounds. */
const restored = new Set();
let round = 0;

for (; round < ROUNDS; round++) {
  const { code, out } = run('npx', ['astro', 'sync']);
  const rejected = [...out.matchAll(/\[InvalidContentEntryDataError\]\s+(\S+)\s+→\s+(\S+)/g)]
    .map(([, collection, id]) => ({ collection, id }));

  if (!rejected.length) {
    if (code === 0) break;
    // Something failed that is not a row: a broken config, a missing image, an
    // Astro upgrade. Not this script's to repair, and not this script's to hide.
    console.error('astro sync failed, but not on a content entry. Left alone:');
    console.error(out.trim().split('\n').slice(-15).join('\n'));
    process.exit(1);
  }

  for (const { collection, id } of rejected) {
    const spec = dirs[collection];
    if (!spec) {
      console.error(`::error::${collection} → ${id} was rejected, but ${CONFIG} declares no directory for "${collection}".`);
      process.exit(1);
    }
    const path = `${spec.dir}/${id}${spec.ext}`;
    const key = `${collection}/${id}`;
    const first = !restored.has(key);

    if (first && tracked(path)) {
      run('git', ['checkout', 'HEAD', '--', path]);
      restored.add(key);
      console.log(`  ! ${path} does not match the schema — restored the last good copy`);
      alerts.set(key, {
        kind: 'entry-rejected',
        section: spec.dir.replace('src/content/', ''),
        title: `${id}: this row no longer matches the schema, so the page is showing the last good version`,
        url: path,
      });
    } else {
      if (existsSync(path)) rmSync(path);
      restored.add(key);
      console.log(`  ! ${path} does not match the schema and has no good copy to fall back on — left out`);
      alerts.set(key, {
        kind: 'entry-rejected',
        section: spec.dir.replace('src/content/', ''),
        title: `${id}: this row does not match the schema and is not on the site`,
        url: path,
      });
    }
  }
}

if (round === ROUNDS) {
  console.error(`::error::Still rejecting entries after ${ROUNDS} rounds. Not committing content the deploy would refuse.`);
  process.exit(1);
}

appendAlerts([...alerts.values()]);

if (alerts.size) {
  console.log(`\n  ${alerts.size} row(s) the schema refused; the rest of the content is unaffected.`);
  // A warning, never a failure. The whole point is that one unpublishable row
  // must not stop the other content reaching the site.
  console.log('::warning::Some Notion rows did not match the schema and were held back. See the sync alerts in Discord.');
} else {
  console.log('  Every generated entry matches the schema.');
}
