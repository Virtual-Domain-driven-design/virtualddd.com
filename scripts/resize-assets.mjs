// One-off: cap committed source images at 1600px and recompress, in place.
import sharp from 'sharp';
import { readdirSync, statSync, writeFileSync } from 'node:fs';
const MAX = 1600;
const dirs = ['sessions', 'open-spaces', 'stories', 'heuristics'].map((c) => `src/content/${c}/_assets`);
let before = 0, after = 0, n = 0;
for (const dir of dirs) {
  let files = [];
  try { files = readdirSync(dir); } catch { continue; }
  for (const f of files) {
    const p = `${dir}/${f}`;
    const ext = f.split('.').pop().toLowerCase();
    if (!['png', 'jpg', 'jpeg', 'webp'].includes(ext)) continue;
    const b = statSync(p).size; before += b;
    try {
      let img = sharp(p, { failOn: 'none' });
      const m = await img.metadata();
      if (m.width > MAX || m.height > MAX) img = img.resize({ width: MAX, height: MAX, fit: 'inside', withoutEnlargement: true });
      if (ext === 'png') img = img.png({ compressionLevel: 9, quality: 80 });
      else if (ext === 'webp') img = img.webp({ quality: 82 });
      else img = img.jpeg({ quality: 82, mozjpeg: true });
      const buf = await img.toBuffer();
      if (buf.length < b) { writeFileSync(p, buf); after += buf.length; n++; }
      else after += b;
    } catch (e) { console.log('skip', f, e.message); after += b; }
  }
}
console.log(`resized ${n} images. ${(before / 1e6).toFixed(1)}MB -> ${(after / 1e6).toFixed(1)}MB`);
