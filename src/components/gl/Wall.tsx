'use client';

import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { WallItem } from '@/data';
import { blankTexture, loadTexture } from './textures';
import { cameraZ } from './camera';
import { useWall } from './stores';
import { setCursor, useStore } from '@/lib/store';
import { gsap } from '@/lib/gsap';
import { clamp, damp, mod, rng } from '@/lib/math';
import { artworkStage, containRect } from '@/lib/layout';

/* ───────────────────────────── Shaders ───────────────────────────── */

const vertexShader = /* glsl */ `
  uniform vec2 uViewport;
  uniform float uBend;
  uniform float uBendMix;
  uniform vec2 uVel;
  uniform float uDepth;
  uniform float uHover;
  varying vec2 vUv;
  varying float vShade;

  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    // Inertie : le cœur du plan accuse un léger retard sur le mouvement
    vec2 lag = vec2(sin(uv.y * 3.14159), sin(uv.x * 3.14159));
    w.xy -= uVel * lag * 0.35;
    // Courbure sphérique : les bords s'éloignent de la caméra
    vec2 n = w.xy / (uViewport * 0.5);
    float r2 = dot(n, n);
    w.z += -uBend * uBendMix * r2 - uDepth + uHover * 70.0;
    vShade = clamp(r2 * 0.16 * uBendMix, 0.0, 0.55);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec3 uColor;
  uniform float uLoaded;
  uniform float uHover;
  uniform float uFocus;
  uniform float uActive;
  uniform float uAlpha;
  uniform vec2 uVel;
  uniform vec2 uSize;
  uniform float uSweep;
  varying vec2 vUv;
  varying float vShade;

  void main() {
    vec2 uv = (vUv - 0.5) * (1.0 - 0.07 * uHover) + 0.5;
    vec2 shift = uVel * 0.00045;
    vec3 tex = vec3(
      texture2D(uTex, uv - shift).r,
      texture2D(uTex, uv).g,
      texture2D(uTex, uv + shift).b
    );
    vec3 col = mix(uColor, tex, uLoaded);
    float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
    // Mise en lumière : le tableau survolé s'avive, les autres reculent à peine
    col *= mix(1.0, 0.84, uFocus * (1.0 - uHover));
    col = mix(vec3(lum), col, 1.0 + 0.14 * uHover) * (1.0 + 0.07 * uHover);
    // Reflet qui traverse la toile en diagonale
    float diag = (vUv.x + 1.0 - vUv.y) * 0.5;
    col += exp(-pow((diag - uSweep) * 7.0, 2.0)) * 0.14 * uHover;
    // Liseré ivoire, comme un cadre de lumière
    vec2 dpx = min(vUv, 1.0 - vUv) * uSize;
    float rim = 1.0 - smoothstep(0.0, 1.8, min(dpx.x, dpx.y));
    col = mix(col, vec3(0.93, 0.9, 0.85), rim * uHover);
    // Filtre par salle : les œuvres hors filtre passent en grisaille
    col = mix(vec3(lum) * 0.26, col, uActive);
    col *= 1.0 - vShade;
    gl_FragColor = vec4(col, uAlpha * mix(0.45, 1.0, uActive));
  }
`;

/* ───────────────────────────── Layout ───────────────────────────── */

type Placed = { item: WallItem; col: number; x: number; y: number; w: number; h: number };
type Column = { x: number; height: number; offset: number };

function computeLayout(items: WallItem[], vw: number, vh: number) {
  const mobile = vw < 768;
  const colW = mobile ? Math.max(128, vw * 0.4) : clamp(vw * 0.15, 190, 300);
  const gapX = colW * (mobile ? 0.16 : 0.22);
  const gapY = colW * (mobile ? 0.2 : 0.28);
  const pitch = colW + gapX;
  const cols = Math.max(4, Math.ceil((vw * 1.4 + colW * 2) / pitch));
  const periodX = cols * pitch;
  const r = rng(1906);
  const heights = new Array<number>(cols).fill(0);
  const placed: Placed[] = [];
  for (const item of items) {
    let c = 0;
    for (let i = 1; i < cols; i++) if (heights[i] < heights[c]) c = i;
    const s = [0.64, 0.78, 0.9, 1][Math.floor(r() * 4)];
    let w = colW * s;
    let h = w / item.aspect;
    const maxH = colW * 1.42;
    if (h > maxH) {
      h = maxH;
      w = h * item.aspect;
    }
    const x = (colW - w) * (r() - 0.5) * 0.9;
    placed.push({ item, col: c, x, y: heights[c] + h / 2, w, h });
    heights[c] += h + gapY * (0.7 + r() * 0.6);
  }
  const minH = vh * 1.5 + colW * 1.6;
  const columns: Column[] = heights.map((height, i) => ({
    x: i * pitch - periodX / 2 + pitch / 2,
    height: Math.max(height, minH),
    offset: r() * height,
  }));
  return { placed, columns, periodX, colW };
}

/** Mélange déterministe qui évite deux œuvres du même artiste côte à côte */
function interleave(items: WallItem[]) {
  const r = rng(42);
  const a = [...items].sort(() => r() - 0.5);
  for (let i = 1; i < a.length; i++) {
    if (a[i].artist === a[i - 1].artist) {
      const j = a.findIndex((x, k) => k > i && x.artist !== a[i - 1].artist);
      if (j > 0) [a[i], a[j]] = [a[j], a[i]];
    }
  }
  return a;
}

const hexToVec3 = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

/* ───────────────────────────── Scene ───────────────────────────── */

type Node = Placed & {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  u: Record<string, THREE.IUniform>;
  hover: number;
  active: number;
  alpha: number;
  delay: number;
  /** Position monde courante (centre, axe y vers le haut) et échelle */
  gx: number;
  gy: number;
  scale: number;
  /** Échelle hors survol : la zone de survol ne dépend pas de l'état de survol */
  base: number;
};

// Position conservée entre deux visites du Mur
const memory = { x: 0, y: 0, visited: false };

export default function Wall({ items }: { items: WallItem[] }) {
  const { size, gl } = useThree();
  const group = useRef<THREE.Group>(null);

  const list = useMemo(() => {
    const mobile = typeof window !== 'undefined' && window.innerWidth < 768;
    return interleave(mobile ? items.filter((i) => i.featured) : items);
  }, [items]);

  const shared = useMemo(
    () => ({
      geometry: new THREE.PlaneGeometry(1, 1, 18, 18),
      uViewport: { value: new THREE.Vector2(1, 1) },
      uBend: { value: 0 },
      uFocus: { value: 0 },
    }),
    [],
  );

  const nodes = useMemo<Node[]>(
    () =>
      list.map((item) => {
        const u: Record<string, THREE.IUniform> = {
          uViewport: shared.uViewport,
          uBend: shared.uBend,
          uFocus: shared.uFocus,
          uBendMix: { value: 1 },
          uVel: { value: new THREE.Vector2() },
          uDepth: { value: 0 },
          uTex: { value: blankTexture },
          uColor: { value: hexToVec3(item.color) },
          uLoaded: { value: 0 },
          uHover: { value: 0 },
          uActive: { value: 1 },
          uAlpha: { value: 0 },
          uSize: { value: new THREE.Vector2(1, 1) },
          uSweep: { value: -0.5 },
        };
        const material = new THREE.ShaderMaterial({
          vertexShader,
          fragmentShader,
          uniforms: u,
          transparent: true,
          depthWrite: false,
          depthTest: false,
        });
        const mesh = new THREE.Mesh(shared.geometry, material);
        mesh.frustumCulled = false;
        return { item, col: 0, x: 0, y: 0, w: 1, h: 1, mesh, u, hover: 0, active: 1, alpha: 0, delay: 0, gx: 0, gy: 0, scale: 1, base: 1 };
      }),
    [list, shared],
  );

  // État de navigation (mutable, hors React)
  const ctl = useRef({
    pos: { x: memory.x, y: memory.y },
    target: { x: memory.x, y: memory.y },
    vel: { x: 0, y: 0 },
    par: { x: 0, y: 0 },
    mouse: { x: 0, y: 0, inside: false },
    bend: 0,
    flatten: 0,
    intro: 0,
    introStarted: false,
    dragging: false,
    down: { x: 0, y: 0, t: 0, moved: 0 },
    pointerVel: { x: 0, y: 0 },
    last: { x: 0, y: 0, t: 0 },
    lastInteraction: 0,
    hovered: null as Node | null,
    hoverLostAt: 0,
    selected: null as Node | null,
    zoom: null as null | { p: number; from: { x: number; y: number; w: number; h: number }; to: { x: number; y: number; w: number; h: number } },
    layout: computeLayout(list, 1, 1),
  });

  /* Layout (au montage et au redimensionnement) */
  useEffect(() => {
    const c = ctl.current;
    const L = computeLayout(list, size.width, size.height);
    c.layout = L;
    shared.uViewport.value.set(size.width, size.height);
    const maxD = Math.hypot(size.width, size.height) / 2;
    L.placed.forEach((p, i) => {
      const n = nodes[i];
      Object.assign(n, { col: p.col, x: p.x, y: p.y, w: p.w, h: p.h });
      // Position initiale pour l'ordre d'apparition (radial depuis le centre)
      const col = L.columns[p.col];
      const X = mod(col.x + p.x + c.pos.x + L.periodX / 2, L.periodX) - L.periodX / 2;
      const Y = mod(p.y + col.offset + c.pos.y + col.height / 2, col.height) - col.height / 2;
      n.gx = X;
      n.gy = -Y;
      n.delay = clamp(Math.hypot(X, Y) / maxD, 0, 1.4) * 0.55;
    });
  }, [list, nodes, shared, size.width, size.height]);

  /* Montage des meshes + chargement des textures (les plus proches du centre d'abord) */
  useEffect(() => {
    const g = group.current;
    if (!g) return;
    nodes.forEach((n) => g.add(n.mesh));
    let loaded = 0;
    let cancelled = false;
    const order = [...nodes].sort((a, b) => Math.hypot(a.gx, a.gy) - Math.hypot(b.gx, b.gy));
    order.forEach((n) => {
      loadTexture(n.item.sm, gl)
        .then((t) => {
          if (cancelled) return;
          n.u.uTex.value = t;
          gsap.to(n.u.uLoaded, { value: 1, duration: 0.8, ease: 'power2.out' });
        })
        .catch(() => {})
        .finally(() => {
          if (cancelled) return;
          loaded++;
          useWall.getState().set({ loaded: loaded / nodes.length });
        });
    });
    return () => {
      cancelled = true;
      nodes.forEach((n) => {
        g.remove(n.mesh);
        n.mesh.material.dispose();
      });
    };
  }, [nodes, gl]);

  /* Entrées utilisateur sur la surface DOM du Mur */
  useEffect(() => {
    const el = document.getElementById('wall-surface');
    if (!el) return;
    const c = ctl.current;
    const engage = () => {
      c.lastInteraction = performance.now();
      if (!useWall.getState().engaged) useWall.getState().set({ engaged: true });
    };

    const onDown = (e: PointerEvent) => {
      if (c.selected || e.button > 0) return;
      c.dragging = true;
      c.down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
      c.last = { x: e.clientX, y: e.clientY, t: performance.now() };
      c.pointerVel = { x: 0, y: 0 };
      el.setPointerCapture(e.pointerId);
      setCursor('dragging');
    };
    const onMove = (e: PointerEvent) => {
      c.mouse.x = e.clientX;
      c.mouse.y = e.clientY;
      c.mouse.inside = true;
      if (!c.dragging) return;
      const now = performance.now();
      const dx = e.clientX - c.last.x;
      const dy = e.clientY - c.last.y;
      const dt = Math.max(1, now - c.last.t);
      const k = e.pointerType === 'touch' ? 1.5 : 1.15;
      c.target.x += dx * k;
      c.target.y += dy * k;
      c.pointerVel.x = c.pointerVel.x * 0.6 + (dx / dt) * 0.4 * k;
      c.pointerVel.y = c.pointerVel.y * 0.6 + (dy / dt) * 0.4 * k;
      c.down.moved += Math.abs(dx) + Math.abs(dy);
      c.last = { x: e.clientX, y: e.clientY, t: now };
      if (c.down.moved > 6) engage();
    };
    const onUp = (e: PointerEvent) => {
      if (!c.dragging) return;
      c.dragging = false;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      const isClick = c.down.moved < 8 && performance.now() - c.down.t < 600;
      if (isClick) {
        const hit = hitTest(e.clientX, e.clientY);
        if (hit) select(hit);
      } else {
        // Lancer : on prolonge le geste
        c.target.x += clamp(c.pointerVel.x, -6, 6) * 240;
        c.target.y += clamp(c.pointerVel.y, -6, 6) * 240;
      }
      setCursor(c.hovered ? 'view' : 'drag', c.hovered ? 'Voir' : 'Glisser');
    };
    const onLeave = () => {
      c.mouse.inside = false;
    };
    const onWheel = (e: WheelEvent) => {
      if (c.selected) return;
      e.preventDefault();
      const f = e.deltaMode === 1 ? 32 : 1;
      c.target.x -= (e.shiftKey ? e.deltaY : e.deltaX) * f;
      c.target.y -= (e.shiftKey ? 0 : e.deltaY) * f;
      engage();
    };
    const onKey = (e: KeyboardEvent) => {
      if (c.selected) return;
      const step = 260;
      if (e.key === 'ArrowUp') c.target.y += step;
      else if (e.key === 'ArrowDown') c.target.y -= step;
      else if (e.key === 'ArrowLeft') c.target.x += step;
      else if (e.key === 'ArrowRight') c.target.x -= step;
      else return;
      engage();
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    setCursor('drag', 'Glisser');
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      memory.x = c.target.x;
      memory.y = c.target.y;
      setCursor('default');
      useWall.getState().set({ hovered: null, engaged: false });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Projection CPU identique au vertex shader (sans l'inertie) */
  const project = (x: number, y: number, bendMix = 1) => {
    const vw = size.width;
    const vh = size.height;
    const D = cameraZ(vh);
    const nx = x / (vw / 2);
    const ny = y / (vh / 2);
    const z = -ctl.current.bend * bendMix * (nx * nx + ny * ny);
    const s = D / (D - z);
    return [x * s, y * s] as const;
  };

  function hitTest(clientX: number, clientY: number): Node | null {
    const px = clientX - size.width / 2;
    const py = -(clientY - size.height / 2);
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (!n.mesh.visible || n.alpha < 0.5 || n.active < 0.5) continue;
      const hw = (n.w * n.base) / 2;
      const hh = (n.h * n.base) / 2;
      const q = [
        project(n.gx - hw, n.gy - hh),
        project(n.gx + hw, n.gy - hh),
        project(n.gx + hw, n.gy + hh),
        project(n.gx - hw, n.gy + hh),
      ];
      let inside = true;
      for (let k = 0; k < 4; k++) {
        const [ax, ay] = q[k];
        const [bx, by] = q[(k + 1) % 4];
        if ((bx - ax) * (py - ay) - (by - ay) * (px - ax) < 0) {
          inside = false;
          break;
        }
      }
      if (inside) return n;
    }
    return null;
  }

  function select(n: Node) {
    const c = ctl.current;
    if (c.selected) return;
    const store = useStore.getState();
    if (store.phase !== 'idle') return;
    c.selected = n;
    c.target = { ...c.pos };
    const href = `/oeuvres/${n.item.slug}`;
    store.set({ phase: 'out', transition: { href, mode: 'zoom', label: n.item.title } });
    setCursor('hidden');
    useWall.getState().set({ hovered: null });

    // Rectangle de départ : tel qu'il apparaît à l'écran (courbure comprise)
    const [cx, cy] = project(n.gx, n.gy);
    const [ex] = project(n.gx + (n.w * n.scale) / 2, n.gy);
    const [, ey] = project(n.gx, n.gy + (n.h * n.scale) / 2);
    const from = { x: cx, y: cy, w: Math.abs(ex - cx) * 2, h: Math.abs(ey - cy) * 2 };
    // Rectangle d'arrivée : emplacement exact du tableau sur la page œuvre
    const r = containRect(n.item.aspect, artworkStage(size.width, size.height));
    const to = { x: r.x + r.w / 2 - size.width / 2, y: -(r.y + r.h / 2 - size.height / 2), w: r.w, h: r.h };
    c.zoom = { p: 0, from, to };
    n.u.uBendMix.value = 0;
    n.mesh.renderOrder = 10;

    // Précharge la version moyenne pour l'image de relais
    const md = n.item.md;
    const pre = new Image();
    pre.src = md;

    gsap.to(c, { flatten: 1, duration: 1, ease: 'power2.inOut' });
    gsap.to(c.zoom, {
      p: 1,
      duration: 1.25,
      ease: 'museum',
      onComplete: () => {
        const go = () => {
          useStore.getState().set({ handoff: { src: md, rect: r } });
          useStore.getState().navigate?.(href);
        };
        if (pre.complete) go();
        else {
          pre.onload = go;
          pre.onerror = go;
        }
      },
    });
  }

  /* Boucle de rendu */
  useFrame((_, delta) => {
    const c = ctl.current;
    const dt = Math.min(delta, 1 / 20);
    const { phase, introDone, wallFilter } = useStore.getState();
    const L = c.layout;
    const vw = size.width;
    const vh = size.height;

    // Intro : démarre quand le préchargement / le rideau est levé
    if (!c.introStarted && introDone && (phase === 'idle' || phase === 'in')) {
      c.introStarted = true;
      c.lastInteraction = performance.now();
      gsap.to(c, { intro: 1.6, duration: memory.visited ? 1.8 : 2.6, ease: 'power2.out' });
      memory.visited = true;
    }

    // Dérive lente quand personne ne touche au Mur
    const idle = performance.now() - c.lastInteraction > 3500;
    if (!c.dragging && !c.selected && !c.hovered && idle && c.introStarted) c.target.y -= 16 * dt;

    const px = c.pos.x;
    const py = c.pos.y;
    c.pos.x = damp(c.pos.x, c.target.x, 5.5, dt);
    c.pos.y = damp(c.pos.y, c.target.y, 5.5, dt);
    const f = 1 / Math.max(dt * 60, 0.001);
    c.vel.x = damp(c.vel.x, clamp((c.pos.x - px) * f, -70, 70), 10, dt);
    c.vel.y = damp(c.vel.y, clamp((c.pos.y - py) * f, -70, 70), 10, dt);

    // Parallaxe souris
    const mx = c.mouse.inside ? (c.mouse.x / vw - 0.5) : 0;
    const my = c.mouse.inside ? (c.mouse.y / vh - 0.5) : 0;
    c.par.x = damp(c.par.x, -mx * 36, 2.5, dt);
    c.par.y = damp(c.par.y, -my * 36, 2.5, dt);

    // Courbure : plus marquée en mouvement
    const speed = Math.hypot(c.vel.x, c.vel.y);
    const baseBend = vw < 768 ? 220 : 340;
    c.bend = damp(c.bend, (baseBend + Math.min(speed, 60) * 7) * (1 - c.flatten), 4, dt);
    shared.uBend.value = c.bend;

    // Survol (souris uniquement, hors glisser)
    const setHovered = (n: Node | null) => {
      c.hovered = n;
      c.hoverLostAt = 0;
      useWall.getState().set({ hovered: n?.item ?? null });
      setCursor(n ? 'view' : 'drag', n ? 'Voir' : 'Glisser');
      if (n) gsap.fromTo(n.u.uSweep, { value: -0.4 }, { value: 1.4, duration: 1.3, ease: 'power2.inOut' });
    };
    if (!c.dragging && !c.selected && c.mouse.inside && c.intro > 1) {
      const hit = hitTest(c.mouse.x, c.mouse.y);
      if (hit && hit !== c.hovered) setHovered(hit);
      else if (!hit && c.hovered) {
        // Délai de grâce : traverser un interstice ne rallume pas tout le mur
        const now = performance.now();
        if (!c.hoverLostAt) c.hoverLostAt = now;
        else if (now - c.hoverLostAt > 180) setHovered(null);
      } else if (hit) c.hoverLostAt = 0;
    } else if (c.hovered && (c.dragging || !c.mouse.inside)) {
      setHovered(null);
    }
    shared.uFocus.value = damp(shared.uFocus.value, c.hovered ? 1 : 0, 3.5, dt);

    const glVel = new THREE.Vector2(c.vel.x, -c.vel.y);
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    for (const n of nodes) {
      const col = L.columns[n.col];
      if (!col) continue;
      const X = mod(col.x + n.x + c.pos.x + c.par.x + L.periodX / 2, L.periodX) - L.periodX / 2;
      const Y = mod(n.y + col.offset + c.pos.y + c.par.y + col.height / 2, col.height) - col.height / 2;
      n.gx = X;
      n.gy = -Y;

      const local = clamp((c.intro - n.delay) / 0.9);
      const e = ease(local);
      const isSel = c.selected === n;
      const visibleTarget = c.selected ? (isSel ? 1 : 0) : 1;
      n.alpha = c.selected ? damp(n.alpha, visibleTarget, isSel ? 20 : 7, dt) : e;
      n.hover = damp(n.hover, c.hovered === n ? 1 : 0, 7, dt);
      n.active = damp(n.active, wallFilter < 0 || n.item.salle === wallFilter ? 1 : 0, 5, dt);
      n.base = 0.72 + 0.28 * e;
      n.scale = n.base * (1 + 0.03 * n.hover);

      const m = n.mesh;
      if (isSel && c.zoom) {
        const t = c.zoom.p;
        const { from, to } = c.zoom;
        m.position.set(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, 0);
        m.scale.set(from.w + (to.w - from.w) * t, from.h + (to.h - from.h) * t, 1);
        n.u.uVel.value.set(0, 0);
        n.u.uDepth.value = 0;
        n.u.uHover.value = n.hover * (1 - t);
        m.visible = true;
      } else {
        const margin = Math.max(n.w, n.h);
        m.visible = n.alpha > 0.002 && Math.abs(X) < vw * 0.8 + margin && Math.abs(Y) < vh * 0.8 + margin;
        if (!m.visible) continue;
        m.position.set(X, -Y, 0);
        m.scale.set(n.w * n.scale, n.h * n.scale, 1);
        n.u.uSize.value.set(n.w * n.scale, n.h * n.scale);
        n.u.uVel.value.copy(glVel);
        n.u.uDepth.value = (1 - e) * 700;
        n.u.uHover.value = n.hover;
      }
      n.u.uActive.value = n.active;
      n.u.uAlpha.value = n.alpha;
    }
  });

  return <group ref={group} />;
}
