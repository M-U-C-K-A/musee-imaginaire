'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { initLenis } from '@/lib/lenis';
import Header from './Header';
import Transition from './Transition';
import Handoff from './Handoff';
import Cursor from './Cursor';
import Preloader from './Preloader';

const GLCanvas = dynamic(() => import('../gl/GLCanvas'), { ssr: false });

export default function AppShell({ artists, works }: { artists: number; works: number }) {
  useEffect(() => {
    initLenis();
  }, []);

  return (
    <>
      <GLCanvas />
      <Header />
      <Handoff />
      <Transition />
      <Preloader artists={artists} works={works} />
      <Cursor />
      <div className="grain" aria-hidden />
    </>
  );
}
