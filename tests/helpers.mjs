/** Shared test helpers: read the built site, and serve it like a real host. */
import { createServer } from 'node:http';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

export const DIST = 'dist';

/** How many entries a collection has on disk.
 *
 * Lets a test assert a *relationship* — "every published session has a page" —
 * instead of a number like `> 100` that an editor unpublishing a few sessions
 * would turn red. The number that matters is never the size of the archive; it
 * is whether the build lost any of it. */
export const published = (collection, ext = '.md') =>
  readdirSync(`src/content/${collection}`).filter((f) => f.endsWith(ext)).length;

/** Every built HTML page, as { path, html }. `path` is the URL path. */
export function pages() {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name === 'index.html') {
        out.push({
          path: p.slice(DIST.length).replace(/index\.html$/, ''),
          file: p,
          html: readFileSync(p, 'utf8'),
        });
      }
    }
  };
  walk(DIST);
  return out;
}

export const attr = (html, re) => (html.match(re) ?? [])[1];

/** The markup without its scripts.
 *
 * A test that counts `data-test="card"` in raw HTML also counts the selector
 * inside an inline script that looks for those cards — which made a refactor
 * look like a missing card. Count elements, not text. */
export const markup = (html = '') => html.replace(/<script[\s\S]*?<\/script>/g, '');

/** How many elements carry a `data-test` hook. */
export const countHook = (html, hook) =>
  (markup(html).match(new RegExp(`<[^>]*data-test="${hook}"`, 'g')) ?? []).length;

/** Text as a reader sees it: names carry apostrophes, and HTML escapes them. */
export const text = (s = '') =>
  s.replace(/&(?:#39|#x27|apos);/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
export const meta = (html, name) =>
  attr(html, new RegExp(`<meta[^>]*(?:name|property)="${name}"[^>]*content="([^"]*)"`)) ??
  attr(html, new RegExp(`<meta[^>]*content="([^"]*)"[^>]*(?:name|property)="${name}"`));

/** Serve dist/ the way a static host does, so browser tests hit the real build. */
export function serveDist(port = 4331) {
  const TYPES = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
    '.xml': 'application/xml', '.txt': 'text/plain', '.ics': 'text/calendar',
    '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json',
  };
  const server = createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = join(DIST, url);
    if (url.endsWith('/')) file = join(file, 'index.html');
    if (!existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => {
    server.listen(port, () => resolve({ server, base: `http://localhost:${port}` }));
  });
}
