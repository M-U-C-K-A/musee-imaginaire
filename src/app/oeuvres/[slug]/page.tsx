import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ArtworkView, { type ArtworkWork } from '@/components/artwork/ArtworkView';
import { getArtist, getWork, neighbours, salles, works, type Work } from '@/data';

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return works.map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const w = getWork(slug);
  if (!w) return {};
  return {
    title: `${w.title} — ${w.by}`,
    description: w.text,
    openGraph: { images: [{ url: w.src.md, width: w.image.w, height: w.image.h }] },
  };
}

const lite = (w: Work): ArtworkWork => ({
  slug: w.slug,
  title: w.title,
  original: w.original,
  by: w.by,
  year: w.year,
  medium: w.medium,
  size: w.size,
  location: w.location,
  text: w.text,
  number: w.number,
  image: { w: w.image.w, h: w.image.h, color: w.image.color },
  src: w.src,
});

export default async function ArtworkPage({ params }: Params) {
  const { slug } = await params;
  const work = getWork(slug);
  if (!work) notFound();
  const artist = getArtist(work.artistSlug)!;
  const salle = salles[work.salleIndex];
  const { prev, next } = neighbours(artist.works, work);
  const more = [...artist.works, ...artist.related].filter((w) => w.slug !== work.slug);

  return (
    <ArtworkView
      key={work.slug}
      work={lite(work)}
      total={works.length}
      artist={{
        slug: artist.slug,
        name: artist.name,
        lifespan: artist.lifespan,
        accent: artist.accent,
        collection: artist.kind === 'collection',
      }}
      salle={{ numeral: salle.numeral, title: salle.short }}
      prev={{ slug: prev.slug, title: prev.title }}
      next={{ slug: next.slug, title: next.title }}
      more={more.map(lite)}
    />
  );
}
