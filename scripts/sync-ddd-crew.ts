/**
 * Sync ddd-crew content.
 *
 * Republishes the README of each curated ddd-crew GitHub repo (CC BY-SA 4.0) into
 * committed markdown under src/content/ddd-crew/, downloading the diagrams into
 * ./_assets/<repo>/ and rewriting relative links so nothing 404s. Attribution and
 * a canonical link to the upstream published version are added in the layout.
 *
 *   tsx scripts/sync-ddd-crew.ts [--write]
 *
 * Without --write it reports what it would do (dry run).
 */
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const OWNER = 'ddd-crew';
const OUT = 'src/content/ddd-crew';
const write = process.argv.includes('--write');

// Curated CC BY-SA 4.0 repos, grouped for the index gallery.
const REPOS: { name: string; category: string; order: number }[] = [
  { name: 'welcome-to-ddd', category: 'Getting started', order: 1 },
  { name: 'ddd-starter-modelling-process', category: 'Getting started', order: 2 },
  { name: 'context-mapping', category: 'Strategic design', order: 1 },
  { name: 'core-domain-charts', category: 'Strategic design', order: 2 },
  { name: 'domain-message-flow-modelling', category: 'Strategic design', order: 3 },
  { name: 'bounded-context-canvas', category: 'Modelling canvases', order: 1 },
  { name: 'aggregate-design-canvas', category: 'Modelling canvases', order: 2 },
  { name: 'como-prep-canvas', category: 'Modelling canvases', order: 3 },
  { name: 'eventstorming-glossary-cheat-sheet', category: 'EventStorming & remote', order: 1 },
  { name: 'virtual-modelling-templates', category: 'EventStorming & remote', order: 2 },
];

const yamlStr = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

async function api(path: string): Promise<any> {
  const res = await fetch(`https://api.github.com/${path}`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'virtualddd-sync' },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${path}`);
  return res.json();
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': 'virtualddd-sync' } });
  if (!res.ok) throw new Error(`fetch ${res.status} for ${url}`);
  return res.text();
}

const RASTER = /\.(png|jpe?g|webp)$/i;

async function downloadImage(url: string, destDir: string, filename: string): Promise<void> {
  const res = await fetch(url, { headers: { 'User-Agent': 'virtualddd-sync' } });
  if (!res.ok) throw new Error(`image ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const dest = join(destDir, filename);
  if (RASTER.test(filename)) {
    // Cap display size; keep diagrams readable without bloating the repo.
    const img = sharp(buf);
    const meta = await img.metadata();
    if ((meta.width ?? 0) > 1600) {
      await img.resize({ width: 1600 }).toFile(dest);
      return;
    }
  }
  writeFileSync(dest, buf);
}

// Resolve a relative repo path against the repo root (handles ./ and ../ crudely).
function resolveRepoPath(rel: string): string {
  const parts: string[] = [];
  for (const seg of rel.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return parts.join('/');
}

async function processRepo(spec: (typeof REPOS)[number]) {
  const { name } = spec;
  const meta = await api(`repos/${OWNER}/${name}`);
  const branch: string = meta.default_branch ?? 'main';
  const rawBase = `https://raw.githubusercontent.com/${OWNER}/${name}/${branch}`;
  const blobBase = `https://github.com/${OWNER}/${name}/blob/${branch}`;

  let md = await fetchText(`${rawBase}/README.md`);

  // Title = first H1; strip it from the body (we render the title ourselves).
  const h1 = md.match(/^\s*#\s+(.+?)\s*$/m);
  const title = (h1?.[1] ?? name).replace(/[#*`]/g, '').trim();
  if (h1) md = md.replace(h1[0], '').replace(/^\s+/, '');

  const contribs = (await api(`repos/${OWNER}/${name}/contributors?per_page=30`))
    .filter((c: any) => c.type === 'User' && !/\[bot\]$/i.test(c.login))
    .slice(0, 24)
    .map((c: any) => ({ name: c.login as string, url: c.html_url as string }));

  const assetsDir = join(OUT, '_assets', name);
  const images = new Map<string, string>(); // repoPath -> local filename
  let heroImage: string | undefined;

  // Collect + rewrite markdown images: ![alt](path "title") and html <img src="path">
  const isRemote = (u: string) => /^https?:\/\//i.test(u) || u.startsWith('data:');
  const claim = (rawPath: string): string | null => {
    const clean = rawPath.split('#')[0].split('?')[0].trim();
    if (!clean || isRemote(clean)) return null;
    const repoPath = resolveRepoPath(clean);
    if (!images.has(repoPath)) {
      let file = repoPath.split('/').pop()!;
      // avoid collisions on basename
      const taken = new Set(images.values());
      while (taken.has(file)) file = '_' + file;
      images.set(repoPath, file);
      if (!heroImage) heroImage = file;
    }
    return `./_assets/${name}/${images.get(repoPath)}`;
  };

  md = md.replace(/!\[([^\]]*)\]\(\s*([^)\s]+)((?:\s+"[^"]*")?)\s*\)/g, (m, alt, url, title2) => {
    const local = claim(url);
    return local ? `![${alt}](${local}${title2})` : m;
  });
  md = md.replace(/<img\b[^>]*?\bsrc=["']([^"']+)["'][^>]*>/gi, (m, url) => {
    const local = claim(url);
    return local ? m.replace(url, local) : m;
  });

  // Rewrite relative NON-image links to absolute GitHub blob URLs (keep anchors + remote).
  md = md.replace(/(^|[^!])\[([^\]]+)\]\(\s*([^)\s]+)((?:\s+"[^"]*")?)\s*\)/g, (m, pre, text, url, title2) => {
    if (isRemote(url) || url.startsWith('#')) return m;
    const clean = url.split('#')[0];
    const anchor = url.slice(clean.length);
    const abs = `${blobBase}/${resolveRepoPath(clean)}${anchor}`;
    return `${pre}[${text}](${abs}${title2})`;
  });

  // Download the images we claimed.
  if (write && images.size) mkdirSync(assetsDir, { recursive: true });
  for (const [repoPath, file] of images) {
    if (!write) continue;
    try {
      await downloadImage(`${rawBase}/${repoPath}`, assetsDir, file);
    } catch (e) {
      console.warn(`    ! image failed ${repoPath}: ${(e as Error).message}`);
    }
  }

  const fm = [
    '---',
    `title: ${yamlStr(title)}`,
    meta.description ? `description: ${yamlStr(meta.description)}` : null,
    `repo: ${yamlStr(meta.html_url)}`,
    `canonical: ${yamlStr(`https://${OWNER}.github.io/${name}/`)}`,
    `license: "CC-BY-SA-4.0"`,
    `category: ${yamlStr(spec.category)}`,
    `order: ${spec.order}`,
    typeof meta.stargazers_count === 'number' ? `stars: ${meta.stargazers_count}` : null,
    heroImage ? `heroImage: ${yamlStr(`./_assets/${name}/${heroImage}`)}` : null,
    'contributors:',
    ...contribs.map((c: any) => `  - { name: ${yamlStr(c.name)}, url: ${yamlStr(c.url)} }`),
    '---',
    '',
  ].filter((l) => l !== null).join('\n');

  const body = fm + md.trim() + '\n';
  if (write) writeFileSync(join(OUT, `${name}.md`), body);
  console.log(`  ✓ ${name} — "${title}" (${images.size} imgs, ${contribs.length} contributors)`);
}

async function main() {
  console.log(`ddd-crew sync ${write ? '(writing)' : '(dry run — pass --write)'}\n`);
  if (write) {
    rmSync(OUT, { recursive: true, force: true });
    mkdirSync(OUT, { recursive: true });
  }
  for (const spec of REPOS) {
    try {
      await processRepo(spec);
    } catch (e) {
      console.error(`  ✗ ${spec.name}: ${(e as Error).message}`);
    }
  }
  console.log(write ? `\nWrote to ${OUT}` : '\nDry run complete.');
}

main();
