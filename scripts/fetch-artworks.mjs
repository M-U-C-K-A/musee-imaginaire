#!/usr/bin/env node
/**
 * Résout chaque `ref` d'œuvre (voir src/data/types.ts) en fichier Wikimedia,
 * télécharge une version ~1920px dans .cache/art-src/ et écrit
 * src/data/credits.json (fichier source, licence, auteur, lien) pour l'équipe droits.
 *
 *   npm run art:fetch            → résout + télécharge ce qui manque
 *   npm run art:fetch -- --dry   → résout seulement (affiche le tableau)
 *   npm run art:fetch -- --only=slug1,slug2 --force
 *
 * Une image déposée à la main dans .cache/art-src/<slug>.(jpg|png|webp)
 * n'est jamais écrasée (sauf --force).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(ROOT, '.cache/art-src');
const CREDITS = path.join(ROOT, 'src/data/credits.json');
const UA = 'MuseeImaginaire/0.1 (digital gallery build script; Node.js)';
const WIDTH = 1920;

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const FORCE = args.includes('--force');
const ONLY = args.find((a) => a.startsWith('--only='))?.slice(7).split(',');

const { salles } = await import(path.join(ROOT, 'src/data/salles/index.ts'));

const works = salles.flatMap((s) => s.artists.flatMap((a) => a.works.map((w) => ({ ...w, by: w.artist ?? a.name }))));
const todo = ONLY ? works.filter((w) => ONLY.includes(w.slug)) : works;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(host, params, attempt = 0) {
  const url = `https://${host}/w/api.php?` + new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (res.status === 429 || res.status >= 500) {
    if (attempt > 8) throw new Error(`${res.status} ${url}`);
    const wait = Number(res.headers.get('retry-after')) * 1000 || 4000 * (attempt + 1);
    process.stdout.write(`  … ${res.status}, pause ${Math.round(wait / 1000)}s\n`);
    await sleep(wait);
    return api(host, params, attempt + 1);
  }
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

/** wiki:/frwiki: → nom de fichier de l'image principale de l'article */
async function resolvePageImages(host, titles) {
  const out = new Map();
  for (const batch of chunk([...new Set(titles)], 40)) {
    const data = await api(host, {
      action: 'query',
      redirects: '1',
      prop: 'pageimages',
      piprop: 'name',
      pilicense: 'any',
      titles: batch.join('|'),
    });
    const alias = new Map();
    for (const n of data.query.normalized ?? []) alias.set(n.from, n.to);
    for (const r of data.query.redirects ?? []) alias.set(r.from, r.to);
    const byTitle = new Map((data.query.pages ?? []).map((p) => [p.title, p]));
    for (const t of batch) {
      let k = t;
      for (let i = 0; i < 3 && alias.has(k); i++) k = alias.get(k);
      const page = byTitle.get(k);
      out.set(t, page && !page.missing && page.pageimage ? page.pageimage : null);
    }
    await sleep(200);
  }
  return out;
}

/** search: → premier fichier bitmap trouvé sur Commons */
async function searchCommons(q) {
  const data = await api('commons.wikimedia.org', {
    action: 'query',
    list: 'search',
    srnamespace: '6',
    srlimit: '8',
    srsearch: `${q} filetype:bitmap`,
  });
  const hits = (data.query?.search ?? []).map((h) => h.title.replace(/^File:/, ''));
  // Écarte les vues d'expo / photos de salle quand c'est possible
  const good = hits.find((h) => !/exhibition|installation|museum view|room|salle|stamp|timbre|detail|détail/i.test(h));
  return good ?? hits[0] ?? null;
}

/** Infos fichier (url miniature, taille, licence) — via en.wikipedia (inclut Commons) */
async function fileInfo(files) {
  const out = new Map();
  for (const batch of chunk([...new Set(files)], 40)) {
    const data = await api('en.wikipedia.org', {
      action: 'query',
      prop: 'imageinfo',
      iiprop: 'url|size|mime|extmetadata',
      iiurlwidth: String(WIDTH),
      iiextmetadatafilter: 'LicenseShortName|Artist|Credit|UsageTerms|NonFree',
      titles: batch.map((f) => `File:${f}`).join('|'),
    });
    const norm = new Map((data.query.normalized ?? []).map((n) => [n.to, n.from]));
    for (const p of data.query.pages ?? []) {
      const key = (norm.get(p.title) ?? p.title).replace(/^File:/, '');
      const ii = p.imageinfo?.[0];
      if (!ii) {
        out.set(key, null);
        continue;
      }
      const meta = ii.extmetadata ?? {};
      const strip = (v) => (v?.value ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      out.set(key, {
        file: key,
        url: ii.thumburl ?? ii.url,
        width: ii.thumbwidth ?? ii.width,
        height: ii.thumbheight ?? ii.height,
        originalWidth: ii.width,
        originalHeight: ii.height,
        mime: ii.mime,
        page: ii.descriptionurl,
        repository: p.imagerepository,
        license: strip(meta.LicenseShortName) || null,
        nonFree: Boolean(meta.NonFree?.value),
        author: strip(meta.Artist) || null,
        credit: strip(meta.Credit) || null,
      });
    }
    await sleep(200);
  }
  return out;
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function findLocal(slug) {
  for (const ext of ['jpg', 'jpeg', 'png', 'webp', 'tif', 'tiff']) {
    const p = path.join(SRC_DIR, `${slug}.${ext}`);
    if (await exists(p)) return p;
  }
  return null;
}

async function download(url, dest, attempt = 0) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (res.status === 429 || res.status >= 500) {
    if (attempt > 8) throw new Error(`${res.status} ${url}`);
    const wait = Number(res.headers.get('retry-after')) * 1000 || 5000 * (attempt + 1);
    process.stdout.write(`  … ${res.status}, pause ${Math.round(wait / 1000)}s\n`);
    await sleep(wait);
    return download(url, dest, attempt + 1);
  }
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

// ── 1. Résolution des refs ─────────────────────────────────────────────────
const parse = (ref) => {
  const i = ref.indexOf(':');
  return [ref.slice(0, i), ref.slice(i + 1)];
};

const enTitles = [], frTitles = [];
for (const w of todo) {
  const [kind, v] = parse(w.ref);
  if (kind === 'wiki') enTitles.push(v);
  if (kind === 'frwiki') frTitles.push(v);
}
const enImages = await resolvePageImages('en.wikipedia.org', enTitles);
const frImages = frTitles.length ? await resolvePageImages('fr.wikipedia.org', frTitles) : new Map();

const CACHE = path.join(ROOT, '.cache/resolve.json');
await fs.mkdir(path.dirname(CACHE), { recursive: true });
const searchCache = JSON.parse(await fs.readFile(CACHE, 'utf8').catch(() => '{}'));
const resolved = new Map();
for (const w of todo) {
  const [kind, v] = parse(w.ref);
  let file = null;
  if (kind === 'wiki') file = enImages.get(v);
  else if (kind === 'frwiki') file = frImages.get(v);
  else if (kind === 'file') file = v;
  else if (kind === 'search') {
    if (searchCache[v] && !FORCE) file = searchCache[v];
    else {
      file = await searchCommons(v);
      if (file) searchCache[v] = file;
      await fs.writeFile(CACHE, JSON.stringify(searchCache, null, 2));
      await sleep(1200);
    }
  }
  resolved.set(w.slug, file);
}

const infos = await fileInfo([...resolved.values()].filter(Boolean));

// ── 2. Rapport ─────────────────────────────────────────────────────────────
const prev = JSON.parse(await fs.readFile(CREDITS, 'utf8').catch(() => '{}'));
const credits = { ...prev };
const problems = [];
for (const w of todo) {
  const file = resolved.get(w.slug);
  const info = file ? infos.get(file) : null;
  if (!info) {
    problems.push(`${w.slug.padEnd(42)} ✗ ${w.ref}${file ? `  (fichier introuvable: ${file})` : ''}`);
    continue;
  }
  credits[w.slug] = {
    title: w.title,
    artist: w.by,
    ref: w.ref,
    ...info,
    url: undefined,
  };
  const flag = info.nonFree ? ' [NON-FREE]' : info.originalWidth < 1200 ? ' [LOW-RES]' : '';
  console.log(`${w.slug.padEnd(42)} ${String(info.originalWidth).padStart(5)}px  ${file}${flag}`);
}
if (problems.length) {
  console.log('\nÀ corriger :');
  for (const p of problems) console.log('  ' + p);
}

if (DRY) process.exit(0);

// ── 3. Téléchargement ──────────────────────────────────────────────────────
await fs.mkdir(SRC_DIR, { recursive: true });
let n = 0;
for (const w of todo) {
  const file = resolved.get(w.slug);
  const info = file ? infos.get(file) : null;
  if (!info) continue;
  const local = await findLocal(w.slug);
  if (local && !FORCE) continue;
  const ext = /png/.test(info.mime) ? 'png' : 'jpg';
  const dest = path.join(SRC_DIR, `${w.slug}.${ext}`);
  try {
    await download(info.url, dest);
    n++;
    process.stdout.write(`↓ ${w.slug}\n`);
  } catch (e) {
    console.error(`✗ ${w.slug}: ${e.message}`);
  }
  await sleep(1500);
}

const sorted = Object.fromEntries(Object.entries(credits).sort(([a], [b]) => a.localeCompare(b)));
await fs.writeFile(CREDITS, JSON.stringify(sorted, null, 2) + '\n');
console.log(`\n${n} image(s) téléchargée(s). Crédits → src/data/credits.json`);
