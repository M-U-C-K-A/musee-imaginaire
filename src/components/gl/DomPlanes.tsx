'use client';

import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { usePlanes, type PlaneEntry } from './stores';
import { blankTexture, loadTexture } from './textures';
import { gsap } from '@/lib/gsap';
import { clamp, damp } from '@/lib/math';

const vertexShader = /* glsl */ `
  uniform vec2 uVel;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    // Le plan se courbe dans le sens du défilement, comme une toile tendue
    vec2 bow = vec2(sin(uv.y * 3.14159), sin(uv.x * 3.14159));
    w.xy -= uVel * bow * 0.22;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec3 uColor;
  uniform float uLoaded;
  uniform float uHover;
  uniform float uReveal;
  uniform vec2 uPlane;
  uniform float uImageAspect;
  uniform float uCover;
  uniform float uParallax;
  uniform vec2 uVel;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    // object-fit: cover
    if (uCover > 0.5) {
      float pa = uPlane.x / uPlane.y;
      vec2 s = pa > uImageAspect ? vec2(1.0, uImageAspect / pa) : vec2(pa / uImageAspect, 1.0);
      uv = (uv - 0.5) * s + 0.5;
      uv.y += uParallax * (1.0 - s.y) * 0.5;
    }
    // Révélation : la toile se découvre de bas en haut avec un léger zoom arrière
    float zoom = 1.0 - 0.08 * (1.0 - uReveal) - 0.035 * uHover;
    uv = (uv - 0.5) * zoom + 0.5;

    vec2 shift = uVel * 0.00035;
    vec3 tex = vec3(
      texture2D(uTex, uv - shift).r,
      texture2D(uTex, uv).g,
      texture2D(uTex, uv + shift).b
    );
    vec3 col = mix(uColor, tex, uLoaded);

    float wave = sin(vUv.x * 6.0 + uTime * 1.2) * 0.035;
    float edge = uReveal * 1.25 - vUv.y + wave;
    float mask = smoothstep(0.0, 0.06, edge);
    if (mask <= 0.001) discard;
    gl_FragColor = vec4(col, mask);
  }
`;

const hexToVec3 = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

function DomPlane({ entry }: { entry: PlaneEntry }) {
  const { size, gl } = useThree();
  const mesh = useRef<THREE.Mesh>(null);
  const prev = useRef<{ x: number; y: number } | null>(null);
  const vel = useRef(new THREE.Vector2());

  const uniforms = useMemo<Record<string, THREE.IUniform>>(
    () => ({
      uTex: { value: blankTexture },
      uColor: { value: hexToVec3(entry.color) },
      uLoaded: { value: 0 },
      uHover: { value: 0 },
      uReveal: { value: entry.state.reveal },
      uPlane: { value: new THREE.Vector2(1, 1) },
      uImageAspect: { value: entry.aspect },
      uCover: { value: entry.fit === 'cover' ? 1 : 0 },
      uParallax: { value: 0 },
      uVel: { value: new THREE.Vector2() },
      uTime: { value: 0 },
    }),
    [entry],
  );

  // Matériau créé à la main : on garde la référence exacte de `uniforms`
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      }),
    [uniforms],
  );
  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    let alive = true;
    loadTexture(entry.src, gl)
      .then((t) => {
        if (!alive) return;
        uniforms.uTex.value = t;
        uniforms.uLoaded.value = 1;
        entry.el.dataset.gl = 'ready';
      })
      .catch(() => {
        // Échec : on rend la main à l'image DOM
        delete entry.el.dataset.gl;
      });
    return () => {
      alive = false;
    };
  }, [entry, gl, uniforms]);

  useFrame((state, delta) => {
    const m = mesh.current;
    if (!m) return;
    const dt = Math.min(delta, 1 / 20);
    const r = entry.el.getBoundingClientRect();
    const vw = size.width;
    const vh = size.height;
    const off = r.width === 0 || r.bottom < -100 || r.top > vh + 100 || r.right < -100 || r.left > vw + 100;
    if (off || entry.el.dataset.gl !== 'ready') {
      m.visible = false;
      prev.current = null;
      return;
    }
    m.visible = true;
    const x = r.left + r.width / 2 - vw / 2;
    const y = -(r.top + r.height / 2 - vh / 2);
    const vx = prev.current ? clamp(x - prev.current.x, -40, 40) : 0;
    const vy = prev.current ? clamp(y - prev.current.y, -40, 40) : 0;
    prev.current = { x, y };
    vel.current.set(damp(vel.current.x, vx, 5, dt), damp(vel.current.y, vy, 5, dt));
    // sous un demi-pixel, on considère le plan immobile : pas de frémissement résiduel
    if (Math.abs(vel.current.x) < 0.5 && Math.abs(vel.current.y) < 0.5) vel.current.set(0, 0);

    m.position.set(x, y, 0);
    m.scale.set(r.width, r.height, 1);
    uniforms.uPlane.value.set(r.width, r.height);
    uniforms.uVel.value.copy(vel.current);
    uniforms.uHover.value = entry.state.hover;
    uniforms.uReveal.value = entry.state.reveal;
    uniforms.uParallax.value = clamp((r.top + r.height / 2) / vh - 0.5, -1, 1) * entry.state.parallax;
    uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh ref={mesh} frustumCulled={false} visible={false} material={material}>
      <planeGeometry args={[1, 1, 24, 24]} />
    </mesh>
  );
}

export default function DomPlanes() {
  const planes = usePlanes((s) => s.planes);
  return (
    <>
      {planes.map((p) => (
        <DomPlane key={p.id} entry={p} />
      ))}
    </>
  );
}

/** Anime l'état d'un plan depuis le DOM */
export const tweenPlane = (entry: PlaneEntry, vars: gsap.TweenVars) => gsap.to(entry.state, vars);
