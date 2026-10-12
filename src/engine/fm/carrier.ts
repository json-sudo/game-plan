import type { Point, Side } from '../../data/types';
import { ZONE_GRID, zoneOf, type ZoneGrid } from './zones';

export interface CarrierCandidate {
  id: string;
  position: Point;
  isKeeper?: boolean;
}

function distanceBetween(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pickNearest(ball: Point, candidates: readonly CarrierCandidate[]): string | null {
  const nearest = candidates.reduce<CarrierCandidate | null>((best, candidate) => {
    if (!best) return candidate;
    const delta = distanceBetween(candidate.position, ball) - distanceBetween(best.position, ball);
    if (delta < 0) return candidate;
    return delta === 0 && candidate.id < best.id ? candidate : best;
  }, null);
  return nearest ? nearest.id : null;
}

function outfieldFirst(candidates: readonly CarrierCandidate[]): readonly CarrierCandidate[] {
  const outfield = candidates.filter((candidate) => !candidate.isKeeper);
  return outfield.length > 0 ? outfield : candidates;
}

export function nearestCarrier(
  ball: Point,
  candidates: readonly CarrierCandidate[],
): string | null {
  return pickNearest(ball, outfieldFirst(candidates));
}

export function nearestCarrierInLane(
  ball: Point,
  candidates: readonly CarrierCandidate[],
  attacker: Side,
  grid: ZoneGrid = ZONE_GRID,
): string | null {
  const pool = outfieldFirst(candidates);
  const [ballLane] = zoneOf(ball, attacker, grid).split('-');
  const sameLane = pool.filter(
    (candidate) => zoneOf(candidate.position, attacker, grid).split('-')[0] === ballLane,
  );
  return pickNearest(ball, sameLane.length > 0 ? sameLane : pool);
}

export function resolveCarrier(
  ball: Point,
  candidates: readonly CarrierCandidate[],
  override?: string | null,
): string | null {
  if (override && candidates.some((candidate) => candidate.id === override)) return override;
  return nearestCarrier(ball, candidates);
}
