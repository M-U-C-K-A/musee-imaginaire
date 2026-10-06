import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ArtistView, { type CardWork } from '@/components/artist/ArtistView';
import { artists, getArtist, neighbours, salles, type Work } from '@/data';

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return artists.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const a = getArtist(slug);
  if (!a) return {};
  return { title: a.name, description: a.tagline, openGraph: { images: [{ url: a.cover.src.md }] } };
}

const card = (w: Work, foreign = false): CardWork => ({
  slug: w.slug, title: w.title, by: w.by, year: w.year, medium: w.medium, number: w.number,
  image: { w: w.image.w, h: w.image.h, color: w.image.color }, src: w.src, foreign,
});

export default async function ArtistPage({ params }: Params) {
  const { slug } = await params;
  const a = getArtist(slug);
  if (!a) notFound();
  const salle = salles[a.salleIndex];
  const { next } = neighbours(artists, a);
  const nextSalle = salles[next.salleIndex];
  const collection = a.kind === 'collection';
  return (
    <ArtistView
      key={a.slug}
      artist={{
        slug: a.slug, name: a.name, first: a.first, last: a.last, lifespan: a.lifespan, origin: a.origin,
        place: a.place, movement: a.movement, accent: a.accent, tagline: a.tagline, bio: a.bio, quote: a.quote,
        number: a.number, collection,
      }}
      total={artists.length}
      salle={{ numeral: salle.numeral, title: salle.title }}
      works={[...a.works.map((w) => card(w, collection)), ...a.related.map((w) => card(w, true))]}
      cover={card(a.cover)}
      next={{
        slug: next.slug, name: next.name, first: next.first, last: next.last,
        salle: `Salle ${nextSalle.numeral}`, cover: card(next.cover),
      }}
    />
  );
}
