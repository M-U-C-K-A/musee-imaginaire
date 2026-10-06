import type { Metadata, Viewport } from 'next';
import { Instrument_Serif, Geist, Geist_Mono } from 'next/font/google';
import AppShell from '@/components/ui/AppShell';
import { artists, works } from '@/data';
import './globals.css';

const serif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});
const sans = Geist({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Musée Imaginaire — une galerie sans murs',
    template: '%s — Musée Imaginaire',
  },
  description: `Une galerie numérique de ${artists.length} artistes et ${works.length} œuvres, de Léonard de Vinci à Jackson Pollock. Sept salles, cinq siècles, aucun mur.`,
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'Musée Imaginaire',
  },
};

export const viewport: Viewport = {
  themeColor: '#0b0a09',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <AppShell artists={artists.length} works={works.length} />
        <main>{children}</main>
      </body>
    </html>
  );
}
