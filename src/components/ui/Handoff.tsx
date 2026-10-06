'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import s from './shell.module.css';

/** Image fixe qui fait le relais entre le plan WebGL du Mur et la page œuvre */
export default function Handoff() {
  const handoff = useStore((st) => st.handoff);

  useEffect(() => {
    if (!handoff) return;
    // Filet de sécurité si la page n'a pas pris le relais
    const t = setTimeout(() => useStore.getState().set({ handoff: null }), 4000);
    return () => clearTimeout(t);
  }, [handoff]);

  if (!handoff) return null;
  const { rect, src } = handoff;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={s.handoff}
      src={src}
      alt=""
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
    />
  );
}
