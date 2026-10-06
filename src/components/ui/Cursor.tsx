'use client';

import { useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { useStore, type CursorVariant } from '@/lib/store';
import s from './shell.module.css';

/**
 * Curseur personnalisé. Les éléments peuvent déclarer leur état avec
 * data-cursor="view|zoom|drag" et data-cursor-label="…". Les zones dont le
 * curseur est piloté en JS (le Mur) portent data-cursor="managed".
 */
export default function Cursor() {
  const root = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    document.documentElement.classList.add('has-cursor');
    const ring = el.querySelector(`.${s.ring}`) as HTMLElement;
    const dot = el.querySelector(`.${s.dot}`) as HTMLElement;
    const rx = gsap.quickTo(ring, 'x', { duration: 0.55, ease: 'power3.out' });
    const ry = gsap.quickTo(ring, 'y', { duration: 0.55, ease: 'power3.out' });
    const dx = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3.out' });
    const dy = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3.out' });

    let shown = false;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      if (!shown) {
        shown = true;
        gsap.set([ring, dot], { x: e.clientX, y: e.clientY });
        gsap.to(el, { opacity: 1, duration: 0.4 });
      }
      rx(e.clientX);
      ry(e.clientY);
      dx(e.clientX);
      dy(e.clientY);
    };
    const leave = () => {
      shown = false;
      gsap.to(el, { opacity: 0, duration: 0.3 });
    };

    // Délégation : état déclaratif via data-attributes
    const over = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const decl = t.closest<HTMLElement>('[data-cursor]');
      if (decl?.dataset.cursor === 'managed') return;
      if (decl) {
        useStore.getState().set({
          cursor: { variant: decl.dataset.cursor as CursorVariant, label: decl.dataset.cursorLabel },
        });
        return;
      }
      const link = t.closest('a, button, [role="button"], label');
      useStore.getState().set({ cursor: { variant: link ? 'link' : 'default' } });
    };

    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('mouseover', over);
    document.documentElement.addEventListener('mouseleave', leave);

    const unsub = useStore.subscribe((st, prev) => {
      if (st.cursor === prev.cursor) return;
      el.dataset.variant = st.cursor.variant;
      if (label.current) label.current.textContent = st.cursor.label ?? '';
    });

    return () => {
      window.removeEventListener('pointermove', move);
      document.removeEventListener('mouseover', over);
      document.documentElement.removeEventListener('mouseleave', leave);
      document.documentElement.classList.remove('has-cursor');
      unsub();
    };
  }, []);

  return (
    <div ref={root} className={s.cursor} data-variant="default" aria-hidden>
      <div className={s.ring}>
        <span ref={label} className={s.label} />
      </div>
      <div className={s.dot} />
    </div>
  );
}
