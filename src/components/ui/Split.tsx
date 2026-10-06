'use client';

import { createElement, useLayoutEffect, useRef, type ElementType, type ReactNode } from 'react';
import { gsap, ScrollTrigger, SplitText } from '@/lib/gsap';
import { usePageReveal, prefersReducedMotion } from './useReveal';

type Props = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  /** 'page' : à l'ouverture de la page ; 'scroll' : à l'entrée dans le viewport */
  on?: 'page' | 'scroll';
  type?: 'lines' | 'chars' | 'words';
  delay?: number;
  stagger?: number;
  duration?: number;
  id?: string;
};

/** Texte révélé ligne par ligne (ou lettre par lettre) derrière un masque */
export default function Split({
  as = 'div',
  children,
  className,
  on = 'scroll',
  type = 'lines',
  delay = 0,
  stagger,
  duration = 1.25,
  id,
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const split = useRef<SplitText | null>(null);
  const ready = useRef<Promise<void> | null>(null);

  // Découpe après chargement des polices (sinon les retours à la ligne sont faux)
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    el.style.visibility = 'hidden';
    ready.current = document.fonts.ready.then(() => {
      if (!ref.current) return;
      split.current = SplitText.create(el, {
        type: type === 'chars' ? 'lines,chars' : type === 'words' ? 'lines,words' : 'lines',
        mask: 'lines',
        linesClass: 'split-line',
      });
      const targets = type === 'chars' ? split.current.chars : type === 'words' ? split.current.words : split.current.lines;
      gsap.set(targets, { yPercent: 110 });
      el.style.visibility = '';
    });
    return () => {
      split.current?.revert();
      split.current = null;
    };
  }, [type]);

  const play = () => {
    const s = split.current;
    if (!s) return;
    const targets = type === 'chars' ? s.chars : type === 'words' ? s.words : s.lines;
    gsap.to(targets, {
      yPercent: 0,
      duration,
      delay,
      ease: 'glide',
      stagger: stagger ?? (type === 'chars' ? 0.025 : type === 'words' ? 0.04 : 0.09),
    });
  };

  usePageReveal(() => {
    if (prefersReducedMotion()) return;
    let st: ScrollTrigger | undefined;
    ready.current?.then(() => {
      if (on === 'page') play();
      else if (ref.current) {
        st = ScrollTrigger.create({ trigger: ref.current, start: 'top 88%', once: true, onEnter: play });
      }
    });
    return () => st?.kill();
  });

  return createElement(as, { ref, className, id }, children);
}
