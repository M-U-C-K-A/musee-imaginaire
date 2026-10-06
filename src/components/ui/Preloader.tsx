'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap, SplitText } from '@/lib/gsap';
import { lockScroll, unlockScroll } from '@/lib/lenis';
import { useStore } from '@/lib/store';
import { useWall } from '../gl/stores';
import s from './shell.module.css';

type Props = { artists: number; works: number };

/**
 * Écran d'ouverture : compteur lié au chargement réel (polices + textures
 * du Mur), puis le panneau se lève et déclenche l'entrée de la page.
 */
export default function Preloader({ artists, works }: Props) {
  const [gone, setGone] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const status = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    lockScroll('preloader');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    const shown = { v: 0 };
    let fonts = false;
    let split: SplitText | null = null;

    document.fonts.ready.then(() => {
      fonts = true;
      if (!title.current || reduced) return;
      split = SplitText.create(title.current, { type: 'chars,lines', mask: 'lines' });
      gsap.from(split.chars, { yPercent: 110, duration: 1.4, stagger: 0.035, ease: 'glide' });
      gsap.set(title.current, { opacity: 1 });
    });

    const outro = () => {
      const tl = gsap.timeline({
        onComplete: () => {
          unlockScroll('preloader');
          setGone(true);
        },
      });
      tl.to(el.querySelectorAll('[data-fade]'), { opacity: 0, duration: 0.5, ease: 'power2.in' }, 0.1)
        .to(split ? split.chars : title.current, { yPercent: -110, duration: 0.8, stagger: 0.012, ease: 'power3.in' }, 0)
        .to(count.current, { yPercent: -100, opacity: 0, duration: 0.7, ease: 'power3.in' }, 0)
        .to(el, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.15, ease: 'museum' }, 0.55)
        .call(() => useStore.getState().set({ introDone: true }), [], 0.85);
    };

    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.25);
      last = now;
      const t = (now - start) / 1000;
      const onWall = location.pathname === '/';
      const { items, loaded } = useWall.getState();
      const gl = useStore.getState().glSupported;
      let real = fonts ? 0.2 : 0;
      if (onWall && gl) real += 0.8 * (items ? loaded : 0);
      else real += 0.8 * Math.min(1, t / 0.6);
      if (t > 8) real = 1;
      const target = Math.min(real, t / (reduced ? 0.2 : 1.8));
      shown.v += (target - shown.v) * (1 - Math.exp(-5 * dt));
      if (target >= 1 && shown.v > 0.996) shown.v = 1;
      const pct = Math.round(shown.v * 100);
      if (count.current) count.current.textContent = String(pct).padStart(3, '0');
      if (status.current)
        status.current.textContent = onWall && items ? 'Accrochage des œuvres' : 'Ouverture des salles';
      if (bar.current) bar.current.style.transform = `scaleX(${shown.v})`;
      if (shown.v === 1) {
        gsap.ticker.remove(tick);
        outro();
      }
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      split?.revert();
    };
  }, []);

  if (gone) return null;

  return (
    <div ref={root} className={s.loader} role="status" aria-live="polite" aria-label="Chargement">
      <div className={s.loaderTop}>
        <span className="mono faint" data-fade>
          Collection permanente
        </span>
        <span className="mono faint" data-fade>
          {artists} artistes — {works} œuvres
        </span>
      </div>
      <h1 ref={title} className={s.loaderTitle} style={{ opacity: 0 }}>
        Musée <em>Imaginaire</em>
      </h1>
      <div className={s.loaderBottom}>
        <span ref={count} className={s.loaderCount}>
          000
        </span>
        <span ref={status} className="mono dim" data-fade>
          Ouverture des salles
        </span>
      </div>
      <div ref={bar} className={s.loaderBar} data-fade />
    </div>
  );
}
