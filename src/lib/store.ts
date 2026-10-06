'use client';

import { create } from 'zustand';

export type CursorVariant = 'default' | 'link' | 'drag' | 'dragging' | 'view' | 'zoom' | 'hidden';

export type TransitionPhase = 'idle' | 'out' | 'navigating' | 'in';

type Store = {
  /** Préchargement terminé (le rideau d'intro est levé) */
  introDone: boolean;
  loadProgress: number;
  /** Phase de la transition de page */
  phase: TransitionPhase;
  transition: { href: string; label?: string; sub?: string; mode: 'curtain' | 'zoom' } | null;
  cursor: { variant: CursorVariant; label?: string };
  /** Salle filtrée sur le Mur (-1 = toutes) */
  wallFilter: number;
  /** Image de passage (zoom Mur → œuvre) affichée par-dessus le canvas */
  handoff: { src: string; rect: { x: number; y: number; w: number; h: number } } | null;
  glSupported: boolean;
  /** Navigation programmatique, fournie par le TransitionManager (côté DOM) */
  navigate: ((href: string) => void) | null;
  set: (p: Partial<Omit<Store, 'set'>>) => void;
};

export const useStore = create<Store>((set) => ({
  introDone: false,
  loadProgress: 0,
  phase: 'idle',
  transition: null,
  cursor: { variant: 'default' },
  wallFilter: -1,
  handoff: null,
  glSupported: true,
  navigate: null,
  set: (p) => set(p),
}));

export const setCursor = (variant: CursorVariant, label?: string) =>
  useStore.getState().set({ cursor: { variant, label } });
