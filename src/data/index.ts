import type { ArtistInput, SalleInput, WorkInput } from './types.ts';
import { salles as rawSalles } from './salles/index.ts';
import imageManifest from './images.json';

export type ImageInfo = { w: number; h: number; color: string; blur: string; v?: string };

export type Work = Omit<WorkInput, 'ref'> & {
  /** Auteur affiché (artiste ou auteur pour les collections) */
  by: string;
  artistSlug: string;
  artistName: string;
  salleId: string;
  salleIndex: number;
  /** Numéro d'inventaire global, 1-based */
  number: number;
  image: ImageInfo;
  src: { sm: string; md: string; lg: string };
};

export type Artist = Omit<ArtistInput, 'works' | 'also'> & {
  number: number;
  salleId: string;
  salleIndex: number;
  works: Work[];
  /** Œuvres d'autres pages rattachées (collection Vénus) */
  related: Work[];
  cover: Work;
  lifespan: string;
};

export type Salle = Omit<SalleInput, 'artists'> & { index: number; artists: Artist[] };

const images = imageManifest as Record<string, ImageInfo | undefined>;

// Les fichiers sont servis en cache « immutable » : la version force le rechargement
// Les <img> et textures WebGL n'héritent pas du basePath : on le préfixe ici
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const srcOf = (slug: string, v?: string) => {
  const q = v ? `?v=${v}` : '';
  const at = (size: string) => `${BASE}/art/${size}/${slug}.webp${q}`;
  return { sm: at('sm'), md: at('md'), lg: at('lg') };
};

let workNumber = 0;
let artistNumber = 0;
const workIndex = new Map<string, Work>();

export const salles: Salle[] = rawSalles.map((s, salleIndex) => {
  const artists = s.artists.map((a) => {
    const works: Work[] = [];
    for (const { ref: _ref, ...w } of a.works) {
      const image = images[w.slug];
      // Une œuvre sans image (pas encore récupérée) n'est pas exposée
      if (!image) continue;
      const work: Work = {
        ...w,
        by: w.artist ?? a.name,
        artistSlug: a.slug,
        artistName: a.name,
        salleId: s.id,
        salleIndex,
        number: ++workNumber,
        image,
        src: srcOf(w.slug, image.v),
      };
      works.push(work);
      workIndex.set(work.slug, work);
    }
    const { works: _w, also, ...rest } = a;
    return {
      ...rest,
      also,
      number: ++artistNumber,
      salleId: s.id,
      salleIndex,
      works,
      related: [] as Work[],
      cover: works[0],
      lifespan: a.dates ?? `${a.born} — ${a.died}`,
    };
  });
  return { ...s, index: salleIndex, artists };
});

// Résout les rattachements (`also`) une fois toutes les œuvres indexées
for (const s of salles) {
  for (const a of s.artists as (Artist & { also?: string[] })[]) {
    a.related = (a.also ?? []).map((slug) => workIndex.get(slug)).filter((w): w is Work => Boolean(w));
    delete a.also;
  }
}

export const artists: Artist[] = salles.flatMap((s) => s.artists).filter((a) => a.works.length > 0);
export const works: Work[] = artists.flatMap((a) => a.works);

export const getArtist = (slug: string) => artists.find((a) => a.slug === slug);
export const getWork = (slug: string) => workIndex.get(slug);
export const getSalle = (id: string) => salles.find((s) => s.id === id);

export function neighbours<T>(list: T[], item: T) {
  const i = list.indexOf(item);
  return {
    prev: list[(i - 1 + list.length) % list.length],
    next: list[(i + 1) % list.length],
  };
}

/** Version allégée pour le Mur (envoyée au client) */
export type WallItem = {
  slug: string;
  title: string;
  by: string;
  year: string;
  artist: string;
  salle: number;
  aspect: number;
  color: string;
  featured: boolean;
  sm: string;
  md: string;
};

export function wallItems(): WallItem[] {
  return artists.flatMap((a) =>
    a.works.map((w, i) => ({
      slug: w.slug,
      title: w.title,
      by: w.by,
      year: w.year,
      artist: a.slug,
      salle: w.salleIndex,
      aspect: w.image.w / w.image.h,
      color: w.image.color,
      featured: i < 3,
      sm: w.src.sm,
      md: w.src.md,
    })),
  );
}

export const pad = (n: number, len = 3) => String(n).padStart(len, '0');
