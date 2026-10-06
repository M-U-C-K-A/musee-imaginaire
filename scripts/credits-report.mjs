#!/usr/bin/env node
/**
 * Exporte credits.json en CSV (credits.csv à la racine) pour l'équipe droits.
 * Colonne `a_remplacer` : oui si l'image est non libre (fair use Wikipédia)
 * ou si la source fait moins de 1200 px de large.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const credits = JSON.parse(await fs.readFile(path.join(ROOT, 'src/data/credits.json'), 'utf8'));
const { salles } = await import(path.join(ROOT, 'src/data/salles/index.ts'));

const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const rows = [['salle', 'artiste_page', 'slug', 'titre', 'auteur', 'fichier', 'page_source', 'licence', 'non_libre', 'largeur_source', 'a_remplacer']];
let flagged = 0;
for (const s of salles) {
  for (const a of s.artists) {
    for (const w of a.works) {
      const c = credits[w.slug] ?? {};
      const replace = c.nonFree || (c.originalWidth ?? 0) < 1200;
      if (replace) flagged++;
      rows.push([s.numeral, a.name, w.slug, w.title, w.artist ?? a.name, c.file, c.page, c.license, c.nonFree ? 'oui' : 'non', c.originalWidth, replace ? 'oui' : 'non']);
    }
  }
}
await fs.writeFile(path.join(ROOT, 'credits.csv'), '﻿' + rows.map((r) => r.map(esc).join(';')).join('\n') + '\n');
console.log(`credits.csv : ${rows.length - 1} œuvres, ${flagged} à remplacer (non libres ou < 1200 px)`);
