/**
 * Géométrie partagée entre le CSS et le WebGL : la transition « zoom » du Mur
 * doit atterrir exactement là où la page œuvre affiche le tableau.
 * Garder synchronisé avec .hero / .stage dans components/artwork/artwork.module.css
 */
export const HEADER_H = 88;

export const gutter = (vw: number) => Math.min(36, Math.max(16, vw * 0.022));

export type Rect = { x: number; y: number; w: number; h: number };

export function artworkStage(vw: number, vh: number): Rect {
  const g = gutter(vw);
  if (vw >= 900) {
    return { x: g, y: HEADER_H, w: vw * 0.62 - g * 2, h: vh - HEADER_H - 56 };
  }
  return { x: g, y: HEADER_H, w: vw - g * 2, h: vh * 0.58 };
}

export function containRect(aspect: number, box: Rect): Rect {
  let w = box.w;
  let h = w / aspect;
  if (h > box.h) {
    h = box.h;
    w = h * aspect;
  }
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}
