'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { getLenis, lockScroll, unlockScroll } from '@/lib/lenis';
import { useStore } from '@/lib/store';
import s from './shell.module.css';

// Tracés du rideau (viewBox 0 0 100 100) : même structure pour être interpolables
const IN = {
  hidden: 'M 0 100 V 100 Q 50 100 100 100 V 100 z',
  curved: 'M 0 100 V 45 Q 50 -5 100 45 V 100 z',
  full: 'M 0 100 V 0 Q 50 0 100 0 V 100 z',
};
const OUT = {
  full: 'M 0 0 V 100 Q 50 100 100 100 V 0 z',
  curved: 'M 0 0 V 55 Q 50 105 100 55 V 0 z',
  hidden: 'M 0 0 V 0 Q 50 0 100 0 V 0 z',
};

/**
 * Orchestration des changements de page :
 * idle → out (rideau / zoom) → navigating (router.push) → in (révélation) → idle
 */
export default function Transition() {
  const router = useRouter();
  const pathname = usePathname();
  const root = useRef<HTMLDivElement>(null);
  const path = useRef<SVGPathElement>(null);
  const title = useRef<HTMLParagraphElement>(null);
  const sub = useRef<HTMLParagraphElement>(null);
  const first = useRef(true);

  // Fournit la navigation programmatique au reste de l'app (WebGL compris)
  useEffect(() => {
    useStore.getState().set({
      navigate: (href: string) => {
        useStore.getState().set({ phase: 'navigating' });
        router.push(href, { scroll: false });
      },
    });
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  }, [router]);

  // Phase « out » : le rideau monte et recouvre la page
  useEffect(
    () =>
      useStore.subscribe((st, prev) => {
        if (st.phase !== 'out' || prev.phase === 'out' || !st.transition) return;
        const t = st.transition;
        router.prefetch(t.href);
        if (t.mode !== 'curtain') return;
        lockScroll('transition');
        if (title.current) title.current.textContent = t.label ?? '';
        if (sub.current) sub.current.textContent = t.sub ?? '';
        const tl = gsap.timeline({
          onComplete: () => useStore.getState().navigate?.(t.href),
        });
        tl.set(root.current, { visibility: 'visible' })
          .set(path.current, { attr: { d: IN.hidden } })
          .to(path.current, { attr: { d: IN.curved }, duration: 0.45, ease: 'power2.in' })
          .to(path.current, { attr: { d: IN.full }, duration: 0.4, ease: 'power2.out' })
          .fromTo(
            [title.current, sub.current],
            { yPercent: 60, opacity: 0 },
            { yPercent: 0, opacity: 1, duration: 0.7, stagger: 0.06, ease: 'glide' },
            0.45,
          );
      }),
    [router],
  );

  // Changement de route effectif : on remet le scroll à zéro et on révèle
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const lenis = getLenis();
    lenis?.scrollTo(0, { immediate: true, force: true });
    window.scrollTo(0, 0);
    const st = useStore.getState();
    if (st.phase !== 'navigating') {
      // Navigation par l'historique du navigateur : pas de rideau
      requestAnimationFrame(() => ScrollTrigger.refresh());
      return;
    }
    const mode = st.transition?.mode;
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        ScrollTrigger.refresh();
        useStore.getState().set({ phase: 'in' });
        unlockScroll('transition');
        if (mode === 'curtain') {
          gsap
            .timeline({
              onComplete: () => {
                gsap.set(root.current, { visibility: 'hidden' });
                useStore.getState().set({ phase: 'idle', transition: null });
              },
            })
            .to([title.current, sub.current], { yPercent: -40, opacity: 0, duration: 0.4, ease: 'power2.in' })
            .set(path.current, { attr: { d: OUT.full } })
            .to(path.current, { attr: { d: OUT.curved }, duration: 0.4, ease: 'power2.in' }, 0.15)
            .to(path.current, { attr: { d: OUT.hidden }, duration: 0.45, ease: 'power2.out' });
        } else {
          gsap.delayedCall(1, () => useStore.getState().set({ phase: 'idle', transition: null }));
        }
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  return (
    <div ref={root} className={s.curtain} aria-hidden>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <path ref={path} d={IN.hidden} />
      </svg>
      <div className={s.curtainLabel}>
        <p ref={sub} className={`mono ${s.curtainSub}`} />
        <p ref={title} className={s.curtainTitle} />
      </div>
    </div>
  );
}
