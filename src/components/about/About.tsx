'use client';

import { gsap } from '@/lib/gsap';
import { useRef } from 'react';
import { usePageReveal, prefersReducedMotion } from '../ui/useReveal';
import Split from '../ui/Split';
import TLink from '../ui/TLink';
import s from './about.module.css';

export type Credit = {
  slug: string;
  title: string;
  artist: string;
  file: string;
  page?: string;
  license: string | null;
  nonFree: boolean;
};

export default function About({ credits, totals }: { credits: Credit[]; totals: { artists: number; works: number } }) {
  const hero = useRef<HTMLElement>(null);

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

  return (
    <div className={s.page}>
      <section ref={hero} className={s.hero}>
        <p className="mono faint" data-in>
          À propos
        </p>
        <h1 className={s.h1}>
          <Split as="span" on="page" type="chars" stagger={0.025}>
            Un musée
          </Split>
          <Split as="span" on="page" type="chars" className="italic" delay={0.2} stagger={0.025}>
            sans murs
          </Split>
        </h1>
        <p className={s.lede} data-in>
          En 1947, André Malraux publie <em>Le Musée imaginaire</em>. Grâce à la photographie, écrit-il, chacun peut
          désormais réunir dans sa mémoire des œuvres qu&apos;aucun musée ne rassemblera jamais : une fresque romaine
          à côté d&apos;un Vermeer, un masque à côté d&apos;un Picasso.
        </p>
      </section>

      <section className={s.block}>
        <p className={`mono ${s.label}`}>
          <span className={s.accent}>I.</span> Le projet
        </p>
        <div className={s.text}>
          <Split as="p" className={s.lead}>
            Ce site est un musée imaginaire au sens de Malraux : une collection personnelle, accrochée selon des
            affinités plutôt que selon l&apos;histoire officielle.
          </Split>
          <Split as="p" className={s.para}>
            {`${totals.artists} artistes et ${totals.works} œuvres, de Léonard de Vinci à Jackson Pollock, répartis en sept salles. On y croise Mucha à côté de Modigliani, Hilma af Klint à côté de Klimt, et Vénus partout — de Botticelli à Bouguereau.`}
          </Split>
        </div>
      </section>

      <section className={s.block}>
        <p className={`mono ${s.label}`}>
          <span className={s.accent}>II.</span> Mode d&apos;emploi
        </p>
        <ol className={s.guide}>
          <li>
            <span className="mono faint">01</span>
            <h2 className={s.guideTitle}>Le Mur</h2>
            <p>
              Toutes les œuvres sur une seule paroi sans fin. Glisser, faire défiler ou utiliser les flèches du
              clavier ; filtrer par salle ; cliquer sur un tableau pour s&apos;en approcher.
            </p>
          </li>
          <li>
            <span className="mono faint">02</span>
            <h2 className={s.guideTitle}>Les Salles</h2>
            <p>Le plan du musée : sept salles, chacune présentée par un texte et ses artistes.</p>
          </li>
          <li>
            <span className="mono faint">03</span>
            <h2 className={s.guideTitle}>Le cartel</h2>
            <p>
              Chaque œuvre a sa page : maintenir le clic sur le tableau pour la loupe, ← et → pour passer à la
              suivante.
            </p>
          </li>
        </ol>
      </section>

      <section className={s.block}>
        <p className={`mono ${s.label}`}>
          <span className={s.accent}>III.</span> Colophon
        </p>
        <dl className={s.colophon}>
          <div>
            <dt className="mono faint">Technique</dt>
            <dd>Next.js, React Three Fiber / Three.js, GSAP, Lenis</dd>
          </div>
          <div>
            <dt className="mono faint">Typographie</dt>
            <dd>Instrument Serif, Geist, Geist Mono</dd>
          </div>
          <div>
            <dt className="mono faint">Textes</dt>
            <dd>Cartels et notices rédigés pour le Musée Imaginaire</dd>
          </div>
        </dl>
      </section>

      {credits.length > 0 && (
        <section className={s.block}>
          <p className={`mono ${s.label}`}>
            <span className={s.accent}>IV.</span> Crédits photographiques
          </p>
          <div className={s.text}>
            <p className={s.para}>
              Reproductions issues de Wikimedia Commons et de Wikipédia. Le détail de chaque source et de sa licence
              figure ci-dessous.
            </p>
            <details className={s.details}>
              <summary className="mono">Afficher les {credits.length} sources</summary>
              <ul className={s.credits}>
                {credits.map((c) => (
                  <li key={c.slug}>
                    <TLink href={`/oeuvres/${c.slug}`} label={c.title} className={s.creditTitle}>
                      {c.title}
                    </TLink>
                    <span className="faint">{c.artist}</span>
                    {c.page ? (
                      <a href={c.page} target="_blank" rel="noreferrer" className="mono u-link">
                        {c.license ?? 'Source'}
                      </a>
                    ) : (
                      <span className="mono">{c.license ?? '—'}</span>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </section>
      )}

      <section className={s.end}>
        <TLink href="/" label="Le Mur" className={s.endLink} data-cursor="view" data-cursor-label="Entrer">
          <span className="mono faint">Retour à l&apos;accrochage</span>
          <span className={s.endTitle}>Le Mur →</span>
        </TLink>
      </section>
    </div>
  );
}
