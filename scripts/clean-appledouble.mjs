#!/usr/bin/env node
/**
 * Sur un disque exFAT, macOS crée des fichiers « ._nom » (métadonnées AppleDouble)
 * à côté de chaque fichier écrit. Le cache disque de Turbopack (.next/**) les prend
 * pour ses propres fichiers et refuse de démarrer (« Failed to open database »).
 * Ce script les supprime avant chaque `dev` / `build`. Sans effet ailleurs.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let removed = 0;

async function walk(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  await Promise.all(
    entries.map(async (e) => {
      const p = path.join(dir, e.name);
      if (e.name.startsWith('._')) {
        await fs.rm(p, { force: true });
        removed++;
      } else if (e.isDirectory() && e.name !== 'node_modules') {
        await walk(p);
      }
    }),
  );
}

for (const d of ['.next', 'src', 'public']) await walk(path.join(ROOT, d));
if (removed) console.log(`clean-appledouble : ${removed} fichier(s) ._* supprimé(s)`);
