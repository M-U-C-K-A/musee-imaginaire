'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';

/**
 * Exécute `cb` une seule fois, au moment où la page devient visible :
 * fin du préchargement au premier chargement, levée du rideau ensuite.
 */
export function usePageReveal(cb: () => void | (() => void)) {
  const introDone = useStore((s) => s.introDone);
  const phase = useStore((s) => s.phase);
  const done = useRef(false);
  const cleanup = useRef<void | (() => void)>(undefined);
  const fn = useRef(cb);
  fn.current = cb;

  useEffect(() => {
    if (done.current || !introDone) return;
    if (phase !== 'in' && phase !== 'idle') return;
    done.current = true;
    cleanup.current = fn.current();
  }, [introDone, phase]);

  useEffect(() => () => {
    if (typeof cleanup.current === 'function') cleanup.current();
  }, []);
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
