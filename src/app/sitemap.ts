import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';
import { artists, works } from '@/data';

const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${base}/`, priority: 1 },
    { url: `${base}/salles/`, priority: 0.9 },
    { url: `${base}/a-propos/`, priority: 0.5 },
    ...artists.map((a) => ({ url: `${base}/artistes/${a.slug}/`, priority: 0.8 })),
    ...works.map((w) => ({ url: `${base}/oeuvres/${w.slug}/`, priority: 0.6 })),
  ];
}
