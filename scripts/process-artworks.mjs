#!/usr/bin/env node
/**
 * Génère les déclinaisons web de chaque œuvre à partir de .cache/art-src/ :
 *   public/art/sm/<slug>.webp   400px  — textures du Mur (WebGL)
 *   public/art/md/<slug>.webp  1200px  — galeries, pages artiste
 *   public/art/lg/<slug>.webp  2400px  — visionneuse / loupe
 * et src/data/images.json : dimensions, couleur dominante, placeholder flou.
 *
 *   npm run art:process            → traite ce qui a changé
 *   npm run art:process -- --force → retraite tout
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(ROOT, '.cache/art-src');
const OUT = path.join(ROOT, 'public/art');
const MANIFEST = path.join(ROOT, 'src/data/images.json');
const FORCE = process.argv.includes('--force');

const SIZES = [
  { dir: 'sm', edge: 400, quality: 74 },
  { dir: 'md', edge: 1200, quality: 78 },
  { dir: 'lg', edge: 2400, quality: 82 },
];

const { salles } = await import(path.join(ROOT, 'src/data/salles/index.ts'));
const slugs = salles.flatMap((s) => s.artists.flatMap((a) => a.works.map((w) => w.slug)));

const files = (await fs.readdir(SRC_DIR).catch(() => [])).filter((f) => !f.startsWith('.'));
const srcFor = new Map();
for (const f of files) {
  const slug = f.replace(/\.[a-z0-9]+$/i, '');
  srcFor.set(slug, path.join(SRC_DIR, f));
}

for (const s of SIZES) await fs.mkdir(path.join(OUT, s.dir), { recursive: true });
const manifest = JSON.parse(await fs.readFile(MANIFEST, 'utf8').catch(() => '{}'));

const hex = ({ r, g, b }) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

const mtime = async (p) => (await fs.stat(p).catch(() => null))?.mtimeMs ?? 0;

let done = 0;
const missing = [];
for (const slug of slugs) {
  const src = srcFor.get(slug);
  if (!src) {
    missing.push(slug);
    continue;
  }
  const lgPath = path.join(OUT, 'lg', `${slug}.webp`);
  if (!FORCE && manifest[slug] && (await mtime(lgPath)) > (await mtime(src))) continue;

  // Pas de limite de pixels : certains scans Google Art Project sont énormes
  const base = sharp(src, { limitInputPixels: false }).rotate().toColourspace('srgb');
  const meta = await base.metadata();

  for (const s of SIZES) {
    await base
      .clone()
      .resize({ width: s.edge, height: s.edge, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: s.quality, effort: 5 })
      .toFile(path.join(OUT, s.dir, `${slug}.webp`));
  }

  const lg = await sharp(lgPath).metadata();
  const { dominant } = await base.clone().resize(64, 64, { fit: 'inside' }).stats();
  const blur = await base.clone().resize(16, 16, { fit: 'inside' }).webp({ quality: 40 }).toBuffer();

  manifest[slug] = {
    w: lg.width,
    h: lg.height,
    color: hex(dominant),
    blur: `data:image/webp;base64,${blur.toString('base64')}`,
    src: { w: meta.width, h: meta.height },
  };
  done++;
  process.stdout.write(`✓ ${slug} (${lg.width}×${lg.height})\n`);
}

// Version de cache : change dès que l'image source change (URL ?v=…)
for (const slug of slugs) {
  const src = srcFor.get(slug);
  if (!src || !manifest[slug]) continue;
  const st = await fs.stat(src);
  manifest[slug].v = crypto.createHash('md5').update(`${st.size}-${st.mtimeMs}`).digest('hex').slice(0, 8);
}

// Retire les entrées d'œuvres supprimées
for (const k of Object.keys(manifest)) if (!slugs.includes(k)) delete manifest[k];

const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
await fs.writeFile(MANIFEST, JSON.stringify(sorted, null, 1) + '\n');
console.log(`\n${done} œuvre(s) traitée(s), ${Object.keys(sorted).length}/${slugs.length} dans images.json`);
if (missing.length) console.log(`Sans image source : ${missing.join(', ')}`);
