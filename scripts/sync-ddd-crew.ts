/**
 * Sync ddd-crew content.
 *
 * Republishes the README of each ddd-crew repo the site carries (CC BY-SA 4.0)
 * into committed markdown under src/content/ddd-crew/, downloading the diagrams
 * into ./_assets/<repo>/ and rewriting relative links so nothing 404s.
 * Attribution and a canonical link to the upstream published version are added
 * in the layout.
 *
 *   tsx scripts/sync-ddd-crew.ts [--write]
 *
 * Without --write it reports what it would do (dry run).
 *
 * **Which repos** is not decided here. It comes from the 🛠️ ddd-crew database
 * in Notion by way of data/ddd-crew.json, so adding a tool is a row rather than
 * a pull request: run `npm run sync:ddd-crew-config` first, or let the hourly
 * sync do it. Category and order live there too, and are not written into the
 * generated markdown — one fact, one place.
 */
import { writeFileSync, mkdirSync, rmSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { CREW_CONFIG_FILE, retargetBranch, type CrewConfig, type CrewTool } from '../src/lib/ddd-crew';

const OWNER = 'ddd-crew';
const OUT = 'src/content/ddd-crew';
const write = process.argv.includes('--write');

/** The repos to republish, in the order the gallery reads them.
 *
 * A missing or empty config is fatal rather than "nothing to do": the prune at
 * the end deletes any page not in this list, so an unreadable config would take
 * the whole section down and report success. */
function republishedRepos(): CrewTool[] {
  let config: CrewConfig;
  try {
    config = JSON.parse(readFileSync(CREW_CONFIG_FILE, 'utf8'));
  } catch (e) {
    throw new Error(`Cannot read ${CREW_CONFIG_FILE} (${(e as Error).message}). Run: npm run sync:ddd-crew-config`);
  }
  const repos = (config.tools ?? []).filter((t) => t.republished);
  if (!repos.length) {
    throw new Error(`${CREW_CONFIG_FILE} lists no republished repos, so this run would delete every page under ${OUT}. Tick Republished in Notion, or leave the section alone.`);
  }
  return repos;
}

const yamlStr = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

/** GitHub's unauthenticated limit is 60 requests an hour **per IP**, and CI
 *  runners share IPs — so an unauthenticated sync fails intermittently for
 *  reasons that have nothing to do with us. A token raises it to 5,000, and the
 *  workflow's own GITHUB_TOKEN is enough: everything here is public. */
const GH_TOKEN = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;

async function api(path: string): Promise<any> {
  const res = await fetch(`https://api.github.com/${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'virtualddd-sync',
      ...(GH_TOKEN ? { Authorization: `Bearer ${GH_TOKEN}` } : {}),
    },
  });
  if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') {
    const reset = Number(res.headers.get('x-ratelimit-reset') ?? 0) * 1000;
    throw new Error(
      `GitHub rate limit reached${GH_TOKEN ? '' : ' (unauthenticated — set GITHUB_TOKEN)'}` +
      `; resets ${reset ? new Date(reset).toISOString() : 'shortly'}`,
    );
  }
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

async function processRepo(tool: CrewTool) {
  const name = tool.repo;
  const meta = await api(`repos/${OWNER}/${name}`);
  const branch: string = meta.default_branch ?? 'main';
  const rawBase = `https://raw.githubusercontent.com/${OWNER}/${name}/${branch}`;
  const blobBase = `https://github.com/${OWNER}/${name}/blob/${branch}`;

  // Hosting somebody's README in full needs their permission, and the licence
  // is that permission. Nothing else checks: a tick in Notion is otherwise the
  // only thing between us and republishing all-rights-reserved material, which
  // is exactly what these five repos were until the ddd-crew merged licences
  // onto them. A repo with none is refused rather than quietly published; the
  // run fails, so the prune at the end leaves every other page alone.
  const spdx: string | undefined = meta.license?.spdx_id && meta.license.spdx_id !== 'NOASSERTION'
    ? meta.license.spdx_id
    : undefined;
  if (!spdx) {
    throw new Error(`ddd-crew/${name} states no licence, so its README is all rights reserved and may not be republished here. Ask upstream for a licence file, or untick Republished in Notion and let the card link out.`);
  }

  let md = await fetchText(`${rawBase}/README.md`);

  // Before anything is parsed out of it: the README's own absolute links to
  // this repo still say `master` on seven of these, and GitHub only redirects
  // those because the rename went through GitHub. See retargetBranch.
  md = retargetBranch(md, OWNER, name, branch);

  // Title = first H1; strip it from the body (we render the title ourselves).
  const h1 = md.match(/^\s*#\s+(.+?)\s*$/m);
  const title = (h1?.[1] ?? name).replace(/[#*`]/g, '').trim();
  if (h1) md = md.replace(h1[0], '').replace(/^\s+/, '');

  // Description: repo description, else the first real paragraph of the README.
  // Ignore "WIP…" placeholder descriptions in favour of the README.
  let description: string = (meta.description ?? '').trim();
  if (!description || /^wip\b/i.test(description)) {
    description = '';
    const para = md
      .split(/\n\s*\n/)
      .map((s) => s.trim())
      .find((s) => s && !/^[#>!<\-*|]/.test(s));
    if (para) {
      const t = para.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[#*`_]/g, '').replace(/\s+/g, ' ').trim();
      description = t.length > 150 ? t.slice(0, 150).replace(/\s+\S*$/, '') + '…' : t;
    }
  }

  const contribs = (await api(`repos/${OWNER}/${name}/contributors?per_page=30`))
    .filter((c: any) => c.type === 'User' && !/\[bot\]$/i.test(c.login))
    .slice(0, 24)
    .map((c: any) => ({ name: c.login as string, url: c.html_url as string }));

  const assetsDir = join(OUT, '_assets', name);
  // Fresh per-repo asset dir (never wipe the whole collection — a failed repo
  // mid-run must not delete other repos' committed content).
  if (write) rmSync(assetsDir, { recursive: true, force: true });
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
    description ? `description: ${yamlStr(description)}` : null,
    `repo: ${yamlStr(meta.html_url)}`,
    `canonical: ${yamlStr(`https://${OWNER}.github.io/${name}/`)}`,
    // The repository's own licence, never an assumption. This said
    // "CC-BY-SA-4.0" on every page until 2026-08-02, when the first CC BY 4.0
    // repo was republished and the page claimed ShareAlike terms its authors
    // had not chosen.
    `license: ${yamlStr(spdx)}`,
    // No category or order here: they are the site's editorial decision, they
    // live in data/ddd-crew.json, and a second copy in generated front matter
    // is a copy that can disagree with Notion.
    typeof meta.stargazers_count === 'number' ? `stars: ${meta.stargazers_count}` : null,
    heroImage ? `heroImage: ${yamlStr(`./_assets/${name}/${heroImage}`)}` : null,
    'contributors:',
    ...contribs.map((c: any) => `  - { name: ${yamlStr(c.name)}, url: ${yamlStr(c.url)} }`),
    '---',
    '',
  ].filter((l) => l !== null).join('\n');

  // Normalise the heading levels so the shallowest one in the README becomes an
  // h2, under the page's own h1.
  //
  // Demoting everything by one was wrong for the READMEs whose top level is
  // already `##`: those became h3s with no h2 above them, so the page told a
  // screen reader about a level that was not there. Shifting by the distance
  // to h2 handles both — a README with a `# Title` moves down one, a README
  // starting at `###` moves up one, and one already at `##` is left alone.
  const lines = md.split('\n');
  const inFence = lines.map((_, i) => lines.slice(0, i).filter((l) => /^\s*```/.test(l)).length % 2 === 1);
  const levels = lines
    .map((l, i) => (inFence[i] ? null : l.match(/^(#{1,6}) /)?.[1].length ?? null))
    .filter((n): n is number => n !== null);
  const shift = levels.length ? 2 - Math.min(...levels) : 0;
  const demoted = lines
    .map((line, i) => {
      if (inFence[i]) return line;
      return line.replace(/^(#{1,6}) /, (_m, hashes: string) => {
        const level = Math.min(6, Math.max(2, hashes.length + shift));
        return '#'.repeat(level) + ' ';
      });
    })
    .join('\n');

  const body = fm + demoted.trim() + '\n';
  if (write) writeFileSync(join(OUT, `${name}.md`), body);
  console.log(`  ✓ ${name} — "${title}" (${images.size} imgs, ${contribs.length} contributors)`);
}

async function main() {
  const repos = republishedRepos();
  console.log(`ddd-crew sync ${write ? '(writing)' : '(dry run — pass --write)'}, ${repos.length} repos from ${CREW_CONFIG_FILE}\n`);
  if (write) mkdirSync(OUT, { recursive: true });
  let ok = 0;
  const failed: string[] = [];
  for (const tool of repos) {
    try {
      await processRepo(tool);
      ok++;
    } catch (e) {
      failed.push(tool.repo);
      console.error(`  ✗ ${tool.repo}: ${(e as Error).message}`);
    }
  }
  // Prune orphaned markdown for repos no longer republished — but only when the
  // whole run succeeded, so a partial (rate-limited) run never deletes content.
  //
  // Untick Republished, or set a row to anything but Published, and its page
  // stops being generated: /ddd-crew/<repo>/ then 404s. Nothing here records a
  // redirect, because a tool put back next week would be shadowed by the rule
  // that retired it.
  if (write && failed.length === 0) {
    const keep = new Set(repos.map((r) => `${r.repo}.md`));
    for (const f of readdirSync(OUT)) {
      if (f.endsWith('.md') && !keep.has(f)) {
        rmSync(join(OUT, f));
        console.log(`  – pruned ${f}; /ddd-crew/${f.replace(/\.md$/, '')}/ will 404 from the next deploy`);
      }
    }
  }
  console.log(write ? `\nWrote ${ok}/${repos.length} to ${OUT}${failed.length ? ` (failed: ${failed.join(', ')})` : ''}` : '\nDry run complete.');
}

main();
