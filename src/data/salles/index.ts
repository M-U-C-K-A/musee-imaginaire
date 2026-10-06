import type { SalleInput } from '../types.ts';
import { renaissance } from './01-renaissance.ts';
import { venus } from './02-venus.ts';
import { impressionnisme } from './03-impressionnisme.ts';
import { artNouveau } from './04-art-nouveau.ts';
import { mysticisme } from './05-mysticisme.ts';
import { fauvisme } from './06-fauvisme.ts';
import { moderne } from './07-moderne.ts';

export const salles: SalleInput[] = [
  renaissance,
  venus,
  impressionnisme,
  artNouveau,
  mysticisme,
  fauvisme,
  moderne,
];
