import type { Point } from '../../data/types';
import { PITCH_H, PITCH_W } from '../geometry/pitch';

export const MIN_TOKEN_SPACING = 8.5;

const CLEARANCE = 1e-3;
const DEFAULT_MARGIN = 1;
const MAX_PASSES = 400;

export interface SpacingToken {
  id: string;
  point: Point;
  weight?: number;
  fixed?: boolean;
}

export interface SpacingOptions {
  margin?: number;
  minDistance?: (a: string, b: string) => number;
}

function mobilityOf(token: SpacingToken): number {
  if (token.fixed) return 0;
  const weight = token.weight ?? 1;
  return weight > 0 ? 1 / weight : 1;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

function towardCentre(value: number, length: number): number {
  return value <= length / 2 ? 1 : -1;
}

export function enforceSpacing(
  tokens: readonly SpacingToken[],
  options: SpacingOptions = {},
): Map<string, Point> {
  const { margin = DEFAULT_MARGIN, minDistance = () => MIN_TOKEN_SPACING } = options;
  const points = tokens.map((token) => ({ ...token.point }));
  const mobility = tokens.map(mobilityOf);
  const place = (index: number, x: number, y: number) => {
    if (mobility[index] === 0) return;
    const clampedX = clamp(x, margin, PITCH_W - margin);
    const clampedY = clamp(y, margin, PITCH_H - margin);
    const slideX = Math.abs(y - clampedY) * towardCentre(clampedX, PITCH_W);
    const slideY = Math.abs(x - clampedX) * towardCentre(clampedY, PITCH_H);
    points[index] = {
      x: clamp(clampedX + slideX, margin, PITCH_W - margin),
      y: clamp(clampedY + slideY, margin, PITCH_H - margin),
    };
  };

  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    let adjusted = false;
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const total = mobility[i] + mobility[j];
        const dx = points[i].x - points[j].x;
        const dy = points[i].y - points[j].y;
        const distance = Math.hypot(dx, dy);
        const need = minDistance(tokens[i].id, tokens[j].id);
        if (distance >= need || total === 0) continue;
        const [ux, uy] = distance > 0 ? [dx / distance, dy / distance] : [0, 1];
        const push = need + CLEARANCE - distance;
        place(
          i,
          points[i].x + ux * push * (mobility[i] / total),
          points[i].y + uy * push * (mobility[i] / total),
        );
        place(
          j,
          points[j].x - ux * push * (mobility[j] / total),
          points[j].y - uy * push * (mobility[j] / total),
        );
        adjusted = true;
      }
    }
    if (!adjusted) break;
  }

  return new Map(tokens.map((token, index) => [token.id, points[index]]));
}

export function minSpacingOf(points: Iterable<Point>): number {
  const list = [...points];
  let min = Infinity;
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      min = Math.min(min, Math.hypot(list[i].x - list[j].x, list[i].y - list[j].y));
    }
  }
  return min;
}
