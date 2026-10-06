'use client';

import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { usePlanes, type PlaneEntry } from './stores';
import { useStore } from '@/lib/store';
import { gsap } from '@/lib/gsap';

let uid = 0;

type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  color: string;
  fit?: 'fill' | 'cover';
  className?: string;
  style?: CSSProperties;
  /** Révélation à l'entrée dans le viewport */
  reveal?: boolean;
  /** Intensité de la parallaxe interne (fit cover uniquement) */
  parallax?: number;
  priority?: boolean;
  sizes?: string;
  srcSet?: string;
  /** Callback recevant l'entrée WebGL (pour piloter la révélation à la main) */
  onEntry?: (entry: PlaneEntry | null) => void;
};

/**
 * Image doublée par un plan WebGL synchronisé sur sa position DOM.
 * L'<img> reste dans le flux (SEO, accessibilité, repli sans WebGL) et
 * devient transparente dès que la texture est prête.
 */
export default function GLImage({
  src,
  alt,
  width,
  height,
  color,
  fit = 'fill',
  className,
  style,
  reveal = true,
  parallax = 0,
  priority,
  sizes,
  srcSet,
  onEntry,
}: Props) {
  const ref = useRef<HTMLImageElement>(null);
  const glSupported = useStore((s) => s.glSupported);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !glSupported) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.dataset.gl = 'pending';
    const entry: PlaneEntry = {
      id: ++uid,
      el,
      src,
      color,
      aspect: width / height,
      fit,
      state: { reveal: reveal && !reduced ? 0 : 1, hover: 0, parallax },
    };
    usePlanes.getState().add(entry);
    onEntry?.(entry);

    const hoverEl = (el.closest('[data-gl-hover]') as HTMLElement | null) ?? el;
    const on = () => gsap.to(entry.state, { hover: 1, duration: 0.9, ease: 'power2.out' });
    const off = () => gsap.to(entry.state, { hover: 0, duration: 0.9, ease: 'power2.out' });
    hoverEl.addEventListener('mouseenter', on);
    hoverEl.addEventListener('mouseleave', off);

    let io: IntersectionObserver | null = null;
    if (reveal && !reduced && !onEntry) {
      io = new IntersectionObserver(
        ([e]) => {
          if (!e.isIntersecting) return;
          gsap.to(entry.state, { reveal: 1, duration: 1.8, ease: 'power3.out', delay: 0.1 });
          io?.disconnect();
        },
        { threshold: 0.12 },
      );
      io.observe(el);
    }

    return () => {
      io?.disconnect();
      hoverEl.removeEventListener('mouseenter', on);
      hoverEl.removeEventListener('mouseleave', off);
      gsap.killTweensOf(entry.state);
      usePlanes.getState().remove(entry.id);
      onEntry?.(null);
      delete el.dataset.gl;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, glSupported]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={{ backgroundColor: color, objectFit: fit === 'cover' ? 'cover' : undefined, ...style }}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
    />
  );
}
