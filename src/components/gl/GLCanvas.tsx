'use client';

import * as THREE from 'three';
import { useEffect, useLayoutEffect, useState } from 'react';
import { Canvas, advance, useThree } from '@react-three/fiber';
import { usePathname } from 'next/navigation';
import { gsap } from '@/lib/gsap';
import { useStore } from '@/lib/store';
import { FOV, cameraZ } from './camera';
import { useWall } from './stores';
import Wall from './Wall';
import DomPlanes from './DomPlanes';

function PixelCamera() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  useLayoutEffect(() => {
    const z = cameraZ(size.height);
    camera.fov = FOV;
    camera.aspect = size.width / size.height;
    camera.near = 1;
    camera.far = z * 4;
    camera.position.set(0, 0, z);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}

function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export default function GLCanvas() {
  const items = useWall((s) => s.items);
  const pathname = usePathname();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const supported = supportsWebGL();
    useStore.getState().set({ glSupported: supported });
    setOk(supported);
    if (!supported) return;
    // Rendu cadencé par le ticker GSAP, après la mise à jour de Lenis :
    // DOM et WebGL bougent dans la même frame, sans décalage.
    const tick = () => advance(performance.now());
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  if (!ok) return null;

  return (
    <Canvas
      className="gl-canvas"
      frameloop="never"
      flat
      linear
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: FOV, near: 1, far: 10000, position: [0, 0, 1000] }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <PixelCamera />
      {items && pathname === '/' && <Wall items={items} />}
      <DomPlanes />
    </Canvas>
  );
}
