import type { Point } from '../../data/types';
import type { Mode } from '../../state/store';
import { pieceKeyStep } from '../pitch/piece-keys';

export type TokenKeyCommand =
  { kind: 'select' } | { kind: 'move'; point: Point } | { kind: 'bench' };

interface TokenKeyInput {
  key: string;
  shift: boolean;
  base: Point | undefined;
  mode: Mode;
}

const SELECT_KEYS = ['Enter', ' '];
const BENCH_KEYS = ['Delete', 'Backspace'];

export function tokenKeyCommand({ key, shift, base, mode }: TokenKeyInput): TokenKeyCommand | null {
  if (mode === 'fm' && SELECT_KEYS.includes(key)) return { kind: 'select' };
  if (mode === 'openPitch' && BENCH_KEYS.includes(key)) return { kind: 'bench' };
  const point = base ? pieceKeyStep(base, key, shift) : null;
  return point ? { kind: 'move', point } : null;
}
