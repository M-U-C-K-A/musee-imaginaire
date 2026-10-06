import type { Metadata } from 'next';
import SallesIndex from '@/components/salles/SallesIndex';
import { artists, salles, works } from '@/data';

export const metadata: Metadata = {
  title: 'Les Salles',
  description: 'Le plan du Musée Imaginaire : sept salles, de la Renaissance à l’expressionnisme abstrait.',
};

export default function SallesPage() {
  const data = salles
    .map((s) => ({
      id: s.id,
      numeral: s.numeral,
      title: s.title,
      intro: s.intro,
      artists: s.artists
        .filter((a) => a.works.length > 0)
        .map((a) => ({
          slug: a.slug,
          name: a.name,
          number: a.number,
          lifespan: a.lifespan,
          movement: a.movement,
          count: a.works.length + a.related.length,
          accent: a.accent,
          cover: {
            src: a.cover.src.md,
            thumb: a.cover.src.sm,
            color: a.cover.image.color,
            w: a.cover.image.w,
            h: a.cover.image.h,
            title: `${a.cover.title}, ${a.cover.year}`,
          },
        })),
    }))
    .filter((s) => s.artists.length > 0);

  return <SallesIndex salles={data} totals={{ artists: artists.length, works: works.length }} />;
}
