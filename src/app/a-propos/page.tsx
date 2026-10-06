import type { Metadata } from 'next';
import About, { type Credit } from '@/components/about/About';
import { artists, works } from '@/data';
import creditsJson from '@/data/credits.json';

export const metadata: Metadata = {
  title: 'À propos',
  description: 'Le Musée Imaginaire : le projet, le mode d’emploi, le colophon et les crédits photographiques.',
};

type RawCredit = { file?: string; page?: string; license?: string | null; nonFree?: boolean };

export default function AboutPage() {
  const raw = creditsJson as Record<string, RawCredit>;
  const credits: Credit[] = works
    .filter((w) => raw[w.slug]?.file)
    .map((w) => {
      const c = raw[w.slug];
      return {
        slug: w.slug,
        title: w.title,
        artist: w.by,
        file: c.file!,
        page: c.page,
        license: c.license ?? null,
        nonFree: Boolean(c.nonFree),
      };
    });
  return <About credits={credits} totals={{ artists: artists.length, works: works.length }} />;
}
