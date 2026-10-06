'use client';

import * as THREE from 'three';

const cache = new Map<string, Promise<THREE.Texture>>();

/** Texture 1×1 utilisée tant que l'image n'est pas chargée */
export const blankTexture = (() => {
  const t = new THREE.DataTexture(new Uint8Array([20, 18, 16, 255]), 1, 1);
  t.needsUpdate = true;
  return t;
})();

/**
 * Charge et décode une image hors du thread principal (img.decode) puis crée
 * une texture mipmappée. Les promesses sont mises en cache par URL : le Mur,
 * les pages artiste et la visionneuse partagent les mêmes textures.
 */
export function loadTexture(url: string, renderer?: THREE.WebGLRenderer): Promise<THREE.Texture> {
  const hit = cache.get(url);
  if (hit) return hit;
  const p = new Promise<THREE.Texture>((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.crossOrigin = 'anonymous';
    img.src = url;
    img
      .decode()
      .then(() => {
        const t = new THREE.Texture(img);
        t.generateMipmaps = true;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.magFilter = THREE.LinearFilter;
        t.anisotropy = 4;
        t.needsUpdate = true;
        renderer?.initTexture(t);
        resolve(t);
      })
      .catch((e) => {
        cache.delete(url);
        reject(e);
      });
  });
  cache.set(url, p);
  return p;
}
