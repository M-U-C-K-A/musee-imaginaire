'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { CustomEase } from 'gsap/CustomEase';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);
  CustomEase.create('museum', '0.76, 0, 0.24, 1');
  CustomEase.create('glide', '0.16, 1, 0.3, 1');
  gsap.defaults({ ease: 'glide', duration: 1 });
}

export { gsap, ScrollTrigger, SplitText };
