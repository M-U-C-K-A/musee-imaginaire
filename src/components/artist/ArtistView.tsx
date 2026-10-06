'use client';

import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { usePageReveal, prefersReducedMotion } from '../ui/useReveal';
import Split from '../ui/Split';
import TLink from '../ui/TLink';
import GLImage from '../gl/GLImage';
import s from './artist.module.css';

export type CardWork = {
  slug: string;
  title: string;
  by: string;
  year: string;
  medium?: string;
  number: number;
  image: { w: number; h: number; color: string };
  src: { sm: string; md: string; lg: string };
  foreign?: boolean;
};

type Props = {
  artist: {
    slug: string;
    name: string;
    first: string;
    last: string;
    lifespan: string;
    origin: string;
    place?: string;
    movement: string;
    accent: string;
    tagline: string;
    bio: string[];
    quote?: { text: string; source?: string };
    number: number;
    collection: boolean;
  };
  total: number;
  salle: { numeral: string; title: string };
  works: CardWork[];
  cover: CardWork;
  next: { slug: string; name: string; first: string; last: string; salle: string; cover: CardWork };
};

export default function ArtistView({ artist, total, salle, works, cover, next }: Props) {
  const hero = useRef<HTMLElement>(null);
  const gallery = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLElement>(null);
  const progress = useRef<HTMLDivElement>(null);

  usePageReveal(() => {
    const el = hero.current;
    if (!el || prefersReducedMotion()) return;
    const tl = gsap.timeline({ delay: 0.1 });
    tl.from(el.querySelectorAll('[data-in]'), { y: 20, opacity: 0, duration: 1.2, stagger: 0.07, ease: 'glide' }, 0.4);
    tl.from(el.querySelector(`.${s.coverWrap}`), { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.6, ease: 'museum' }, 0.1);
  });

  // Parallaxe du héros : le nom glisse, l'image s'enfonce
  useEffect(() => {
    const el = hero.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.to(`.${s.last}`, {
        xPercent: -8,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true },
      });
      gsap.to(`.${s.coverWrap}`, {
        yPercent: 18,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true },
      });
    }, el);
    return () => ctx.revert();
  }, []);

  // Galerie horizontale épinglée (desktop) — défilement vertical → translation
  useEffect(() => {
    const sec = gallery.current;
    const tr = track.current;
    if (!sec || !tr) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      const distance = () => Math.max(0, tr.scrollWidth - window.innerWidth);
      const tween = gsap.to(tr, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: sec,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (progress.current) progress.current.style.transform = `scaleX(${self.progress})`;
          },
        },
      });
      return () => tween.scrollTrigger?.kill();
    });
    return () => mm.revert();
  }, []);

  // Fin de page : la jauge se remplit vers l'artiste suivant
  useEffect(() => {
    const el = nextRef.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        `.${s.nextName}`,
        { yPercent: 40 },
        { yPercent: 0, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom bottom', scrub: true } },
      );
    }, el);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <article className={s.page} style={{ '--accent': artist.accent } as React.CSSProperties}>
      {/* ── Héros ───────────────────────────────────────────── */}
      <section ref={hero} className={s.hero}>
        <div className={s.heroTop}>
          <p className="mono" data-in>
            <span className={s.accent}>Salle {salle.numeral}</span> — {salle.title}
          </p>
          <p className="mono faint" data-in>
            {artist.collection ? 'Collection' : 'Artiste'} {String(artist.number).padStart(2, '0')} / {total}
          </p>
        </div>

        <div className={s.coverWrap}>
          <div className={s.cover}>
            <GLImage
              src={cover.src.md}
              alt={`${cover.title}, ${cover.by}`}
              width={cover.image.w}
              height={cover.image.h}
              color={cover.image.color}
              fit="cover"
              reveal={false}
              parallax={0.6}
              priority
            />
          </div>
          <p className={`mono faint ${s.coverCap}`}>
            {cover.title}, {cover.year}
          </p>
        </div>

        <p className={s.tagline} data-in>
          {artist.tagline}
        </p>

        <h1 className={s.name}>
          <Split as="span" on="page" type="chars" className={s.first} delay={0.2}>
            {artist.first}
          </Split>
          <Split as="span" on="page" type="chars" className={s.last} delay={0.3} stagger={0.035}>
            {artist.last}
          </Split>
        </h1>

        <dl className={s.facts}>
          <div data-in>
            <dt className="mono faint">{artist.collection ? 'Époques' : 'Vie'}</dt>
            <dd>{artist.lifespan}</dd>
          </div>
          <div data-in>
            <dt className="mono faint">{artist.collection ? 'Auteurs' : 'Origine'}</dt>
            <dd>
              {artist.origin}
              {artist.place ? ` · ${artist.place}` : ''}
            </dd>
          </div>
          <div data-in>
            <dt className="mono faint">Mouvement</dt>
            <dd>{artist.movement}</dd>
          </div>
          <div data-in>
            <dt className="mono faint">Œuvres</dt>
            <dd>{String(works.length).padStart(2, '0')}</dd>
          </div>
        </dl>
      </section>

      {/* ── Biographie ──────────────────────────────────────── */}
      <section className={s.bio}>
        <p className={`mono ${s.label}`}>
          <span className={s.accent}>I.</span> {artist.collection ? 'Le mythe' : 'Biographie'}
        </p>
        <div className={s.bioText}>
          <Split as="p" className={s.lead}>
            {artist.bio[0]}
          </Split>
          {artist.bio.slice(1).map((p, i) => (
            <Split as="p" key={i} className={s.para}>
              {p}
            </Split>
          ))}
          {artist.quote && (
            <figure className={s.quote}>
              <Split as="blockquote" className={s.quoteText}>
                {`« ${artist.quote.text} »`}
              </Split>
              {artist.quote.source && <figcaption className="mono faint">— {artist.quote.source}</figcaption>}
            </figure>
          )}
        </div>
      </section>

      {/* ── Œuvres ──────────────────────────────────────────── */}
      <section ref={gallery} className={s.gallery} aria-label="Œuvres présentées">
        <div className={s.galleryHead}>
          <p className={`mono ${s.label}`}>
            <span className={s.accent}>II.</span> Œuvres présentées ({String(works.length).padStart(2, '0')})
          </p>
          <p className="mono faint">Défiler pour parcourir l&apos;accrochage</p>
        </div>
        <div ref={track} className={s.track}>
          {works.map((w, i) => (
            <TLink
              key={w.slug}
              href={`/oeuvres/${w.slug}`}
              label={w.title}
              sub={w.by}
              className={s.item}
              data-gl-hover
              data-cursor="view"
              data-cursor-label="Voir"
              style={{ '--ar': w.image.w / w.image.h } as React.CSSProperties}
            >
              <div className={s.frame}>
                <GLImage src={w.src.md} alt={`${w.title}, ${w.by}`} width={w.image.w} height={w.image.h} color={w.image.color} />
              </div>
              <div className={s.itemCap}>
                <span className="mono faint">{String(i + 1).padStart(2, '0')}</span>
                <span className={s.itemTitle}>{w.title}</span>
                <span className="mono faint">
                  {w.foreign ? `${w.by}, ` : ''}
                  {w.year}
                </span>
              </div>
            </TLink>
          ))}
        </div>
        <div className={s.progress}>
          <div ref={progress} className={s.progressBar} />
        </div>
      </section>

      {/* ── Artiste suivant ─────────────────────────────────── */}
      <section ref={nextRef} className={s.next}>
        <TLink
          href={`/artistes/${next.slug}`}
          label={next.name}
          sub={next.salle}
          className={s.nextLink}
          data-gl-hover
          data-cursor="view"
          data-cursor-label="Entrer"
        >
          <span className="mono faint">Salle suivante — {next.salle}</span>
          <span className={s.nextName}>
            <span className={s.nextFirst}>{next.first}</span>
            <span className={s.nextLast}>{next.last}</span>
          </span>
          <span className={s.nextCover}>
            <GLImage
              src={next.cover.src.md}
              alt=""
              width={next.cover.image.w}
              height={next.cover.image.h}
              color={next.cover.image.color}
              fit="cover"
            />
          </span>
        </TLink>
      </section>
    </article>
  );
}
