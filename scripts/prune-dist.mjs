/**
 * Post-build: drop unreferenced files from dist/_astro.
 *
 * Astro emits the *original* of every image validated by `image()` in the
 * content schema, even when the pages only ever render the optimised `.webp`
 * it also produced. That was two thirds of the deployed bytes — 167 files and
 * ~23 MB that nothing links to.
 *
 * This walks the built HTML/CSS/JS, collects every asset filename actually
 * referenced, and removes the rest. It is deliberately conservative: anything
 * it cannot prove is unused stays. Run after `astro build`, before rsync.
 */
import { existsSync, readdirSync, readFileSync, rmSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const ASSETS = join(DIST, '_astro');
const SCANNED = ['.html', '.css', '.js', '.mjs', '.xml', '.json', '.txt'];

// Astro leaves its prerender scaffolding in the output. It is not part of the
// site — and because those modules import every asset by name, leaving it in
// place makes every original look "referenced" and defeats the prune below.
const PRERENDER = join(DIST, '.prerender');
if (existsSync(PRERENDER)) rmSync(PRERENDER, { recursive: true, force: true });

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const all = walk(DIST);
const haystack = all
  .filter((f) => SCANNED.some((ext) => f.endsWith(ext)))
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');

let removed = 0;
let bytes = 0;
for (const name of readdirSync(ASSETS)) {
  // Stylesheets and scripts are referenced by <link>/<script>; only prune media.
  if (/\.(css|js|mjs)$/.test(name)) continue;
  if (haystack.includes(name)) continue;
  const p = join(ASSETS, name);
  bytes += statSync(p).size;
  unlinkSync(p);
  removed++;
}

const mb = (bytes / 1024 / 1024).toFixed(1);
console.log(`prune-dist: removed ${removed} unreferenced asset(s), ${mb} MB.`);
