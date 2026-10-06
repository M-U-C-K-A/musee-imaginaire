'use client';

import { create } from 'zustand';
import type { WallItem } from '@/data';

export type PlaneEntry = {
  id: number;
  el: HTMLElement;
  src: string;
  color: string;
  /** Rapport largeur/hauteur de l'image source */
  aspect: number;
  /** 'cover' recadre l'image comme object-fit: cover */
  fit: 'fill' | 'cover';
  /** Valeurs animées depuis le DOM (GSAP) et lues par le shader */
  state: { reveal: number; hover: number; parallax: number };
};

type PlanesStore = {
  planes: PlaneEntry[];
  add: (p: PlaneEntry) => void;
  remove: (id: number) => void;
};

export const usePlanes = create<PlanesStore>((set) => ({
  planes: [],
  add: (p) => set((s) => ({ planes: [...s.planes, p] })),
  remove: (id) => set((s) => ({ planes: s.planes.filter((p) => p.id !== id) })),
}));

type WallStore = {
  items: WallItem[] | null;
  hovered: WallItem | null;
  /** L'utilisateur a commencé à explorer (masque le titre) */
  engaged: boolean;
  loaded: number;
  set: (p: Partial<Omit<WallStore, 'set'>>) => void;
};

export const useWall = create<WallStore>((set) => ({
  items: null,
  hovered: null,
  engaged: false,
  loaded: 0,
  set: (p) => set(p),
}));
