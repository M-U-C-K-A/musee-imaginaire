'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from '@/lib/gsap';
import { usePageReveal, prefersReducedMotion } from '../ui/useReveal';
import Split from '../ui/Split';
import TLink from '../ui/TLink';
import s from './salles.module.css';

export type IndexArtist = {
  slug: string;
  name: string;
  number: number;
  lifespan: string;
  movement: string;
  count: number;
  accent: string;
  cover: { src: string; thumb: string; color: string; w: number; h: number; title: string };
};

export type IndexSalle = {
  id: string;
  numeral: string;
  title: string;
  intro: string;
  artists: IndexArtist[];
};

type Props = { salles: IndexSalle[]; totals: { artists: number; works: number } };

export default function SallesIndex({ salles, totals }: Props) {
  const preview = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLElement>(null);
  const [active, setActive] = useState<IndexArtist | null>(null);
  // Les aperçus ne sont montés qu'au premier survol, puis gardés en cache
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const show = (a: IndexArtist) => {
    setActive(a);
    setSeen((prev) => (prev.has(a.slug) ? prev : new Set(prev).add(a.slug)));
  };

  usePageReveal(() => {
    if (prefersReducedMotion()) return;
    gsap.from(hero.current?.querySelectorAll('[data-in]') ?? [], {
      y: 20,
      opacity: 0,
      duration: 1.2,
      stagger: 0.08,
      delay: 0.5,
      ease: 'glide',
    });
  });

  // Aperçu flottant : suit le curseur et s'incline selon la vitesse
  useEffect(() => {
    const el = preview.current;
    if (!el || !window.matchMedia('(hover: hover)').matches) return;
    const xTo = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'power3.out' });
    const rTo = gsap.quickTo(el, 'rotation', { duration: 0.9, ease: 'power3.out' });
    let lastX = 0;
    const move = (e: PointerEvent) => {
      xTo(e.clientX + 48);
      yTo(e.clientY - el.offsetHeight / 2);
      rTo(gsap.utils.clamp(-12, 12, (e.clientX - lastX) * 0.6));
      lastX = e.clientX;
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, []);

  useEffect(() => {
    const el = preview.current;
    if (!el) return;
    gsap.to(el, {
      autoAlpha: active ? 1 : 0,
      scale: active ? 1 : 0.85,
      duration: active ? 0.6 : 0.35,
      ease: active ? 'glide' : 'power2.out',
    });
  }, [active]);

  return (
    <div className={s.page}>
      <section ref={hero} className={s.hero}>
        <p className="mono faint" data-in>
          Plan du musée
        </p>
        <Split as="h1" on="page" type="chars" className={s.h1} stagger={0.03}>
          Les Salles
        </Split>
        <div className={s.heroFoot}>
          <p className={s.intro} data-in>
            Sept salles, de la Florence de Léonard à l&apos;atelier de Pollock. L&apos;accrochage suit les affinités
            plus que la chronologie : on y passe d&apos;une lumière à l&apos;autre, d&apos;une ligne à son écho.
          </p>
          <dl className={s.stats} data-in>
            <div>
              <dt className="mono faint">Salles</dt>
              <dd>{String(salles.length).padStart(2, '0')}</dd>
            </div>
            <div>
              <dt className="mono faint">Artistes</dt>
              <dd>{String(totals.artists).padStart(2, '0')}</dd>
            </div>
            <div>
              <dt className="mono faint">Œuvres</dt>
              <dd>{String(totals.works).padStart(3, '0')}</dd>
            </div>
          </dl>
        </div>
        <nav className={s.toc} aria-label="Accès direct aux salles" data-in>
          {salles.map((sa) => (
            <a key={sa.id} href={`#${sa.id}`} className="mono u-link">
              <span className={s.tocNum}>{sa.numeral}</span> {sa.title}
            </a>
          ))}
        </nav>
      </section>

      {salles.map((sa) => (
        <section key={sa.id} id={sa.id} className={s.salle} aria-labelledby={`${sa.id}-t`}>
          <header className={s.salleHead}>
            <span className={s.numeral} aria-hidden>
              {sa.numeral}
            </span>
            <div className={s.salleText}>
              <p className="mono faint">Salle {sa.numeral}</p>
              <Split as="h2" id={`${sa.id}-t`} className={s.salleTitle}>
                {sa.title}
              </Split>
              <Split as="p" className={s.salleIntro}>
                {sa.intro}
              </Split>
            </div>
          </header>

          <ul className={s.list}>
            {sa.artists.map((a) => (
              <li key={a.slug} style={{ '--accent': a.accent } as React.CSSProperties}>
                <TLink
                  href={`/artistes/${a.slug}`}
                  label={a.name}
                  sub={`Salle ${sa.numeral}`}
                  className={s.row}
                  data-cursor="view"
                  data-cursor-label="Entrer"
                  onMouseEnter={() => show(a)}
                  onMouseLeave={() => setActive((cur) => (cur?.slug === a.slug ? null : cur))}
                  onFocus={() => show(a)}
                  onBlur={() => setActive(null)}
                >
                  <span className={`mono faint ${s.rowNum}`}>{String(a.number).padStart(2, '0')}</span>
                  <span className={s.rowName}>{a.name}</span>
                  <span className={`mono ${s.rowDates}`}>{a.lifespan}</span>
                  <span className={`mono faint ${s.rowMove}`}>{a.movement}</span>
                  <span className={`mono faint ${s.rowCount}`}>{String(a.count).padStart(2, '0')} œuvres</span>
                  <span className={s.rowThumb} aria-hidden>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.cover.thumb} alt="" loading="lazy" style={{ background: a.cover.color }} />
                  </span>
                </TLink>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div ref={preview} className={s.preview} aria-hidden>
        {salles.flatMap((sa) =>
          sa.artists
            .filter((a) => seen.has(a.slug))
            .map((a) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={a.slug}
                src={a.cover.src}
                alt=""
                className={s.previewImg}
                data-on={active?.slug === a.slug || undefined}
                style={{ background: a.cover.color }}
              />
            )),
        )}
        {active && <span className={`mono ${s.previewCap}`}>{active.cover.title}</span>}
      </div>
    </div>
  );
}
