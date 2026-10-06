/**
 * Source d'image d'une œuvre, résolue par scripts/fetch-artworks.mjs :
 *  - "wiki:Titre"    → image principale de l'article Wikipédia (en)
 *  - "frwiki:Titre"  → idem sur Wikipédia (fr)
 *  - "file:Nom.jpg"  → fichier précis sur Wikimedia Commons / Wikipédia
 *  - "search:mots"   → premier résultat de recherche sur Commons
 * Pour remplacer une image (HD sous licence, scan musée…), déposer le fichier
 * dans .cache/art-src/<slug>.<ext> puis relancer `npm run art:process`.
 */
export type ImageRef = `${'wiki' | 'frwiki' | 'file' | 'search'}:${string}`;

export type WorkInput = {
  slug: string;
  title: string;
  /** Titre original quand il diffère du titre français */
  original?: string;
  /** Pour les collections (Les Vénus) : auteur de l'œuvre */
  artist?: string;
  year: string;
  medium?: string;
  size?: string;
  location?: string;
  text: string;
  ref: ImageRef;
};

export type ArtistInput = {
  slug: string;
  name: string;
  first: string;
  last: string;
  born?: number;
  died?: number;
  /** Remplace born–died à l'affichage (collections) */
  dates?: string;
  origin: string;
  place?: string;
  movement: string;
  accent: string;
  tagline: string;
  bio: string[];
  quote?: { text: string; source?: string };
  kind?: 'collection';
  works: WorkInput[];
  /** Œuvres d'autres pages rattachées (slugs) */
  also?: string[];
};

export type SalleInput = {
  id: string;
  numeral: string;
  title: string;
  short: string;
  intro: string;
  artists: ArtistInput[];
};
