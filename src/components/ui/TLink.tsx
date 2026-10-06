'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentProps, MouseEvent } from 'react';
import { useStore } from '@/lib/store';
import { getLenis } from '@/lib/lenis';

type Props = Omit<ComponentProps<typeof Link>, 'href'> & {
  href: string;
  /** Texte affiché sur le rideau de transition */
  label?: string;
  sub?: string;
};

/** Lien interne qui joue la transition « rideau » avant de changer de page */
export default function TLink({ href, label, sub, onClick, ...rest }: Props) {
  const pathname = usePathname();

  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0 || rest.target === '_blank') return;
    e.preventDefault();
    const s = useStore.getState();
    if (href === pathname) {
      getLenis()?.scrollTo(0, { duration: 1.4 });
      return;
    }
    if (s.phase !== 'idle') return;
    s.set({ phase: 'out', transition: { href, label, sub, mode: 'curtain' } });
  };

  return <Link href={href} onClick={handle} {...rest} />;
}
