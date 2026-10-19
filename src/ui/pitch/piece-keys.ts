import type { Point } from '../../data/types';
import { clampToPitch } from '../../engine';

const STEP = 1;
const LARGE_STEP = 5;

const DIRECTIONS: Record<string, Point> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

export function pieceKeyStep(point: Point, key: string, shift: boolean): Point | null {
  const direction = DIRECTIONS[key];
  if (!direction) return null;
  const amount = shift ? LARGE_STEP : STEP;
  return clampToPitch({ x: point.x + direction.x * amount, y: point.y + direction.y * amount });
}
