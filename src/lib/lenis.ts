'use client';

import Lenis from 'lenis';
import { gsap, ScrollTrigger } from './gsap';

let lenis: Lenis | null = null;

export function initLenis() {
  if (lenis) return lenis;
  lenis = new Lenis({
    autoRaf: false,
    lerp: 0.085,
    wheelMultiplier: 1,
    touchMultiplier: 1.4,
    anchors: { offset: -24 },
  });
  lenis.on('scroll', ScrollTrigger.update);
  const raf = (time: number) => lenis?.raf(time * 1000);
  // prioritaire : le scroll est mis à jour avant le rendu WebGL
  gsap.ticker.add(raf, false, true);
  gsap.ticker.lagSmoothing(0);
  if (locks.size) lenis.stop();
  return lenis;
}

export const getLenis = () => lenis;

/* Verrous de scroll : le Mur, le rideau et le préchargement peuvent chacun
   bloquer le défilement ; Lenis ne repart que lorsqu'ils l'ont tous libéré. */
const locks = new Set<string>();

export function lockScroll(key: string) {
  locks.add(key);
  lenis?.stop();
}

export function unlockScroll(key: string) {
  locks.delete(key);
  if (locks.size === 0) lenis?.start();
}
