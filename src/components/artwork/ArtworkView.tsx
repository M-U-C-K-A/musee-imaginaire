'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { gsap } from '@/lib/gsap';
import { useStore } from '@/lib/store';
import { containRect } from '@/lib/layout';
import { usePageReveal } from '../ui/useReveal';
import Split from '../ui/Split';
import TLink from '../ui/TLink';
import GLImage from '../gl/GLImage';
import s from './artwork.module.css';

export type ArtworkWork = {
  slug: string;
  title: string;
  original?: string;
  by: string;
  year: string;
  medium?: string;
  size?: string;
  location?: string;
  text: string;
  number: number;
  image: { w: number; h: number; color: string };
  src: { sm: string; md: string; lg: string };
};

type Props = {
  work: ArtworkWork;
  total: number;
  artist: { slug: string; name: string; lifespan: string; accent: string; collection: boolean };
  salle: { numeral: string; title: string };
  prev: { slug: string; title: string };
  next: { slug: string; title: string };
  more: ArtworkWork[];
};

const ZOOM = 2.4;
/** Diamètre de la loupe : généreux, proportionnel à l'écran */
const lensSize = () => Math.round(Math.min(480, Math.max(300, window.innerWidth * 0.27)));

export default function ArtworkView({ work, total, artist, salle, prev, next, more }: Props) {
  const router = useRouter();
  const stage = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const lens = useRef<HTMLDivElement>(null);
  const cartel = useRef<HTMLElement>(null);
  const viaZoom = useRef(useStore.getState().handoff !== null);
  const [loaded, setLoaded] = useState(false);
  const aspect = work.image.w / work.image.h;

  // Relais : l'image du Mur reste affichée jusqu'à ce que la nôtre soit prête
  const onLoad = () => {
    setLoaded(true);
    requestAnimationFrame(() => useStore.getState().set({ handoff: null }));
  };
  useEffect(() => {
    if (img.current?.complete) onLoad();
  }, []);

  usePageReveal(() => {
    const items = cartel.current?.querySelectorAll('[data-in]') ?? [];
    gsap.from(items, { y: 24, opacity: 0, duration: 1.2, stagger: 0.05, ease: 'glide', delay: 0.15 });
    if (!viaZoom.current && img.current) {
      gsap.fromTo(
        img.current,
        { clipPath: 'inset(100% 0% 0% 0%)', scale: 1.08 },
        { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 1.6, ease: 'museum' },
      );
    }
  });

  // Navigation clavier entre les œuvres de l'artiste
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (useStore.getState().phase !== 'idle') return;
      const target = e.key === 'ArrowRight' ? next : e.key === 'ArrowLeft' ? prev : null;
      if (!target) return;
      useStore.getState().set({
        phase: 'out',
        transition: { href: `/oeuvres/${target.slug}`, label: target.title, sub: artist.name, mode: 'curtain' },
      });
    };
    window.addEventListener('keydown', key);
    router.prefetch(`/oeuvres/${next.slug}`);
    return () => window.removeEventListener('keydown', key);
  }, [next, prev, artist.name, router]);

  // Loupe : maintenir le clic (ou le doigt) sur le tableau
  useEffect(() => {
    const el = stage.current;
    const l = lens.current;
    if (!el || !l) return;
    let active = false;
    let LENS = lensSize();
    const painted = () => {
      const r = el.getBoundingClientRect();
      const box = containRect(aspect, { x: 0, y: 0, w: r.width, h: r.height });
      return { ...box, x: box.x + r.left, y: box.y + r.top };
    };
    const place = (e: PointerEvent) => {
      const p = painted();
      const px = e.clientX - p.x;
      const py = e.clientY - p.y;
      const inside = px >= 0 && py >= 0 && px <= p.w && py <= p.h;
      gsap.to(l, { autoAlpha: inside ? 1 : 0, duration: 0.2 });
      gsap.set(l, { x: e.clientX - LENS / 2, y: e.clientY - LENS / 2 });
      l.style.backgroundSize = `${p.w * ZOOM}px ${p.h * ZOOM}px`;
      l.style.backgroundPosition = `${-(px * ZOOM - LENS / 2)}px ${-(py * ZOOM - LENS / 2)}px`;
    };
    const down = (e: PointerEvent) => {
      if (e.button > 0) return;
      active = true;
      LENS = lensSize();
      l.style.width = l.style.height = `${LENS}px`;
      el.setPointerCapture(e.pointerId);
      gsap.fromTo(l, { scale: 0.4 }, { scale: 1, duration: 0.6, ease: 'glide' });
      place(e);
      useStore.getState().set({ cursor: { variant: 'hidden' } });
    };
    const move = (e: PointerEvent) => active && place(e);
    const up = (e: PointerEvent) => {
      if (!active) return;
      active = false;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      gsap.to(l, { autoAlpha: 0, scale: 0.6, duration: 0.35, ease: 'power2.in' });
      useStore.getState().set({ cursor: { variant: 'zoom', label: 'Loupe' } });
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, [aspect]);

  return (
    <article className={s.page} style={{ '--accent': artist.accent } as React.CSSProperties}>
      <section className={s.hero}>
        <div
          ref={stage}
          className={s.stage}
          data-cursor="zoom"
          data-cursor-label="Loupe"
          style={{ touchAction: 'none' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={img}
            className={s.painting}
            src={work.src.lg}
            alt={`${work.title}, ${work.by} (${work.year})`}
            width={work.image.w}
            height={work.image.h}
            onLoad={onLoad}
            draggable={false}
            style={{ opacity: loaded || !viaZoom.current ? 1 : 0 }}
          />
        </div>
        <div ref={lens} className={s.lens} style={{ backgroundImage: `url(${work.src.lg})` }} aria-hidden />

        <aside ref={cartel} className={s.cartel} aria-label="Cartel">
          <p className={`mono ${s.kicker}`} data-in>
            <span>N° {String(work.number).padStart(3, '0')} / {total}</span>
            <span>
              Salle {salle.numeral} — {salle.title}
            </span>
          </p>
          <Split as="h1" on="page" className={s.title} delay={0.1}>
            {work.title}
          </Split>
          {work.original && (
            <p className={s.original} data-in>
              {work.original}
            </p>
          )}
          <p className={s.artist} data-in>
            {artist.collection ? (
              <span>{work.by}</span>
            ) : (
              <TLink href={`/artistes/${artist.slug}`} label={artist.name} sub={`Salle ${salle.numeral}`} className="u-link">
                {artist.name}
              </TLink>
            )}
            {!artist.collection && <span className="mono faint"> {artist.lifespan}</span>}
          </p>

          <dl className={s.facts} data-in>
            <div>
              <dt className="mono faint">Date</dt>
              <dd>{work.year}</dd>
            </div>
            {work.medium && (
              <div>
                <dt className="mono faint">Technique</dt>
                <dd>{work.medium}</dd>
              </div>
            )}
            {work.size && (
              <div>
                <dt className="mono faint">Dimensions</dt>
                <dd>{work.size}</dd>
              </div>
            )}
            {work.location && (
              <div>
                <dt className="mono faint">Conservation</dt>
                <dd>{work.location}</dd>
              </div>
            )}
          </dl>

          <p className={s.text} data-in>
            {work.text}
          </p>

          <p className={`mono faint ${s.hint}`} data-in>
            Maintenir le clic sur le tableau pour la loupe · ← → pour naviguer
          </p>

          <nav className={s.pager} aria-label="Œuvres de l'artiste" data-in>
            <TLink href={`/oeuvres/${prev.slug}`} label={prev.title} sub={artist.name} className={s.pageLink}>
              <span className="mono faint">← Précédente</span>
              <span className={s.pageTitle}>{prev.title}</span>
            </TLink>
            <TLink href={`/oeuvres/${next.slug}`} label={next.title} sub={artist.name} className={`${s.pageLink} ${s.right}`}>
              <span className="mono faint">Suivante →</span>
              <span className={s.pageTitle}>{next.title}</span>
            </TLink>
          </nav>
        </aside>
      </section>

      {more.length > 0 && (
        <section className={s.more}>
          <header className={s.moreHead}>
            <Split as="h2" className={s.moreTitle}>
              {artist.collection ? 'Dans la même collection' : `Autres œuvres de ${artist.name}`}
            </Split>
            {!artist.collection ? (
              <TLink href={`/artistes/${artist.slug}`} label={artist.name} className="mono u-link">
                Voir la salle de l&apos;artiste →
              </TLink>
            ) : (
              <TLink href="/artistes/les-venus" label="Les Vénus" className="mono u-link">
                Voir la collection →
              </TLink>
            )}
          </header>
          <ul className={s.moreList}>
            {more.map((w) => (
              <li key={w.slug}>
                <TLink
                  href={`/oeuvres/${w.slug}`}
                  label={w.title}
                  sub={w.by}
                  className={s.card}
                  data-gl-hover
                  data-cursor="view"
                  data-cursor-label="Voir"
                >
                  <div className={s.cardImg} style={{ aspectRatio: `${w.image.w} / ${w.image.h}` }}>
                    <GLImage src={w.src.md} alt={w.title} width={w.image.w} height={w.image.h} color={w.image.color} />
                  </div>
                  <span className="mono faint">{w.year}</span>
                  <span className={s.cardTitle}>{w.title}</span>
                </TLink>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
