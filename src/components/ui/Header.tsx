'use client';

import { usePathname } from 'next/navigation';
import TLink from './TLink';
import s from './shell.module.css';

const links = [
  { href: '/', label: 'Le Mur', curtain: 'Le Mur' },
  { href: '/salles', label: 'Les Salles', curtain: 'Les Salles' },
  { href: '/a-propos', label: 'À propos', curtain: 'À propos', extra: true },
];

export default function Header() {
  const pathname = usePathname();
  const active = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  return (
    <header className={s.header}>
      <TLink href="/" label="Le Mur" className={s.logo} aria-label="Musée Imaginaire — accueil">
        <em>Musée</em> Imaginaire <span className={s.logoMark}>MMXXVI</span>
      </TLink>
      <p className={`${s.tagline} mono`}>Entrée libre · ouvert jour et nuit</p>
      <nav className={s.nav} aria-label="Navigation principale">
        {links.map((l) => (
          <TLink
            key={l.href}
            href={l.href}
            label={l.curtain}
            className={`mono u-link ${l.extra ? s.navExtra : ''}`}
            aria-current={active(l.href) ? 'page' : undefined}
          >
            {l.label}
          </TLink>
        ))}
      </nav>
    </header>
  );
}
