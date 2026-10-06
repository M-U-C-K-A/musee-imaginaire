'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import type { WallItem } from '@/data';
import { useWall } from '../gl/stores';
import { useStore } from '@/lib/store';
import { gsap, SplitText } from '@/lib/gsap';
import { lockScroll, unlockScroll } from '@/lib/lenis';
import { usePageReveal } from '../ui/useReveal';
import TLink from '../ui/TLink';
import s from './wall.module.css';

type SalleChip = { numeral: string; short: string; count: number };

type Props = {
  items: WallItem[];
  salles: SalleChip[];
  artists: number;
};

export default function WallPage({ items, salles, artists }: Props) {
  const title = useRef<HTMLDivElement>(null);
  const caption = useRef<HTMLDivElement>(null);
  const ui = useRef<HTMLDivElement>(null);
  const hovered = useWall((st) => st.hovered);
  const engaged = useWall((st) => st.engaged);
  const filter = useStore((st) => st.wallFilter);
  const gl = useStore((st) => st.glSupported);

  // Le Mur occupe tout l'écran : pas de défilement de page
  useEffect(() => {
    useWall.getState().set({ items, engaged: false });
    lockScroll('wall');
    return () => {
      useWall.getState().set({ items: null, hovered: null });
      useStore.getState().set({ wallFilter: -1 });
      unlockScroll('wall');
    };
  }, [items]);

  // Entrée : le titre se compose lettre à lettre, l'interface glisse en place
  usePageReveal(() => {
    const el = title.current;
    if (!el) return;
    let split: SplitText | null = null;
    document.fonts.ready.then(() => {
      split = SplitText.create(el.querySelectorAll('[data-split]'), { type: 'chars,lines', mask: 'lines' });
      gsap.from(split.chars, { yPercent: 115, duration: 1.6, stagger: 0.03, ease: 'glide', delay: 0.35 });
      gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.01 });
    });
    gsap.from(ui.current?.querySelectorAll('[data-ui]') ?? [], {
      opacity: 0,
      y: 18,
      duration: 1.2,
      stagger: 0.06,
      delay: 0.9,
      ease: 'glide',
    });
    return () => split?.revert();
  });

  // Le titre et l'indication s'effacent dès qu'on explore
  useEffect(() => {
    if (!title.current) return;
    gsap.to(ui.current?.querySelector(`.${s.hint}`) ?? [], { autoAlpha: engaged ? 0 : 1, duration: 0.6 });
    gsap.to(title.current, {
      autoAlpha: engaged ? 0 : 1,
      scale: engaged ? 0.96 : 1,
      filter: engaged ? 'blur(8px)' : 'blur(0px)',
      duration: 1,
      ease: 'power2.out',
    });
  }, [engaged]);

  useEffect(
    () =>
      useStore.subscribe((st, prev) => {
        if (st.phase === prev.phase || st.phase !== 'out') return;
        gsap.to([ui.current, title.current, caption.current], { autoAlpha: 0, duration: 0.5, ease: 'power2.out' });
      }),
    [],
  );

  // Légende qui suit le curseur
  useEffect(() => {
    const el = caption.current;
    if (!el) return;
    const xTo = gsap.quickTo(el, 'x', { duration: 0.7, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.7, ease: 'power3.out' });
    const move = (e: PointerEvent) => {
      const right = e.clientX > window.innerWidth * 0.62;
      xTo(e.clientX + (right ? -el.offsetWidth - 56 : 56));
      yTo(e.clientY + 20);
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, []);

  useEffect(() => {
    const el = caption.current;
    if (!el) return;
    gsap.to(el, { autoAlpha: hovered ? 1 : 0, duration: hovered ? 0.5 : 0.25, ease: 'power2.out' });
    if (hovered) gsap.fromTo(el.querySelectorAll('[data-line]'), { yPercent: 100 }, { yPercent: 0, duration: 0.7, stagger: 0.05, ease: 'glide' });
  }, [hovered]);

  const setFilter = (i: number) => useStore.getState().set({ wallFilter: filter === i ? -1 : i });
  const visibleCount = filter < 0 ? items.length : items.filter((i) => i.salle === filter).length;

  return (
    <section className={s.page} aria-label="Le Mur — toutes les œuvres">
      <div
        id="wall-surface"
        className={s.surface}
        data-cursor="managed"
        tabIndex={0}
        aria-label="Mur d'œuvres : glisser, faire défiler ou utiliser les flèches du clavier pour explorer"
      />

      {!gl && <Fallback items={items} />}

      <div ref={title} className={s.title} style={{ opacity: 0 }}>
        <h1 className={s.h1}>
          <span data-split>Le Musée</span>
          <span data-split className="italic">
            Imaginaire
          </span>
        </h1>
        <p className={`${s.lede} mono`} data-split>
          {artists} artistes · cinq siècles · aucun mur
        </p>
      </div>

      <div ref={caption} className={s.caption} aria-hidden>
        {hovered && (
          <>
            <span className={s.capLine}>
              <span data-line className="mono faint">
                {hovered.year}
              </span>
            </span>
            <span className={s.capLine}>
              <span data-line className={s.capTitle}>
                {hovered.title}
              </span>
            </span>
            <span className={s.capLine}>
              <span data-line className="mono dim">
                {hovered.by}
              </span>
            </span>
          </>
        )}
      </div>

      <div ref={ui} className={s.ui}>
        <p className={`${s.hint} mono`} data-ui>
          <span className={s.hintIcon} aria-hidden>
            ⟷
          </span>
          Glisser pour explorer · cliquer pour entrer
        </p>
        <div className={s.bar}>
          <nav className={s.filters} aria-label="Filtrer par salle" data-ui>
            <button
              className={`${s.chip} mono`}
              aria-pressed={filter < 0}
              onClick={() => useStore.getState().set({ wallFilter: -1 })}
            >
              Tout
            </button>
            {salles.map((sa, i) => (
              <button key={sa.numeral} className={`${s.chip} mono`} aria-pressed={filter === i} onClick={() => setFilter(i)}>
                <span className={s.num}>{sa.numeral}</span> {sa.short}
              </button>
            ))}
          </nav>
          <div className={s.meta} data-ui>
            <span className="mono faint">
              {String(visibleCount).padStart(3, '0')} œuvres
            </span>
            <TLink href="/salles" label="Les Salles" className="mono u-link">
              Index des salles →
            </TLink>
          </div>
        </div>
      </div>

      <nav className="sr-only" aria-label="Toutes les œuvres">
        <ul>
          {items.map((i) => (
            <li key={i.slug}>
              <Link href={`/oeuvres/${i.slug}`}>
                {i.title}, {i.by} ({i.year})
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}

/** Repli sans WebGL : une grille simple et défilable */
function Fallback({ items }: { items: WallItem[] }) {
  useEffect(() => {
    unlockScroll('wall');
  }, []);
  return (
    <div className={s.fallback}>
      {items.map((i) => (
        <TLink key={i.slug} href={`/oeuvres/${i.slug}`} label={i.title} className={s.fbItem}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={i.sm} alt={`${i.title}, ${i.by}`} loading="lazy" style={{ aspectRatio: i.aspect, background: i.color }} />
        </TLink>
      ))}
    </div>
  );
}
