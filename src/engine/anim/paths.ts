import type { Point } from '../../data/types';
import { distance, lerp } from '../fm/point';
import { BODY_DISTANCE } from '../fm/shape';

export interface PlayerPath {
  from: Point;
  to: Point;
  delay: number;
  via: Point | null;
}

export type Frame = Readonly<Record<string, Point>>;

const CHECK_STEPS = 64;
const DELAYS = [0.2, 0.35, 0.5];
const DETOURS = [3, 5, 7, -3, -5, -7];
const MAX_REPAIRS = 24;

export function pathPointAt(path: PlayerPath, progress: number): Point {
  const share = Math.min(1, Math.max(0, (progress - path.delay) / (1 - path.delay)));
  const { from, to, via } = path;
  if (!via) return lerp(from, to, share);
  const control = { x: 2 * via.x - (from.x + to.x) / 2, y: 2 * via.y - (from.y + to.y) / 2 };
  const u = 1 - share;
  return {
    x: u * u * from.x + 2 * u * share * control.x + share * share * to.x,
    y: u * u * from.y + 2 * u * share * control.y + share * share * to.y,
  };
}

function pathGap(a: PlayerPath, b: PlayerPath): number {
  let gap = Infinity;
  for (let step = 0; step <= CHECK_STEPS; step += 1) {
    const progress = step / CHECK_STEPS;
    gap = Math.min(gap, distance(pathPointAt(a, progress), pathPointAt(b, progress)));
  }
  return gap;
}

function isStill(path: PlayerPath): boolean {
  return distance(path.from, path.to) === 0;
}

function conflictsOf(id: string, paths: ReadonlyMap<string, PlayerPath>): string[] {
  const own = paths.get(id)!;
  return [...paths]
    .filter(([otherId, other]) => otherId !== id && !(isStill(own) && isStill(other)))
    .filter(([, other]) => pathGap(own, other) < BODY_DISTANCE)
    .map(([otherId]) => otherId)
    .sort();
}

function violationCount(paths: ReadonlyMap<string, PlayerPath>): number {
  return [...paths.keys()].reduce((sum, id) => sum + conflictsOf(id, paths).length, 0);
}

function remediesOf(path: PlayerPath): PlayerPath[] {
  const length = distance(path.from, path.to);
  const middle = lerp(path.from, path.to, 0.5);
  const normal = { x: -(path.to.y - path.from.y) / length, y: (path.to.x - path.from.x) / length };
  return [
    ...DELAYS.map((delay) => ({ ...path, delay })),
    ...DETOURS.map((offset) => ({
      ...path,
      via: { x: middle.x + normal.x * offset, y: middle.y + normal.y * offset },
    })),
  ];
}

function repairOne(
  id: string,
  paths: ReadonlyMap<string, PlayerPath>,
): ReadonlyMap<string, PlayerPath> | null {
  const path = paths.get(id)!;
  if (isStill(path)) return null;
  const attempts = remediesOf(path).map((candidate) => new Map(paths).set(id, candidate));
  const best = attempts.reduce((a, b) => (violationCount(b) < violationCount(a) ? b : a));
  return violationCount(best) < violationCount(paths) ? best : null;
}

function moversFor(
  id: string,
  paths: ReadonlyMap<string, PlayerPath>,
  receiverId: string | null,
): string[] {
  return [id, ...conflictsOf(id, paths)].sort(
    (a, b) => Number(a === receiverId) - Number(b === receiverId) || a.localeCompare(b),
  );
}

export function planPaths(
  from: Frame,
  to: Frame,
  receiverId: string | null,
): ReadonlyMap<string, PlayerPath> {
  let paths: ReadonlyMap<string, PlayerPath> = new Map(
    Object.keys(from).map((id) => [
      id,
      { from: from[id], to: to[id] ?? from[id], delay: 0, via: null },
    ]),
  );
  for (let repair = 0; repair < MAX_REPAIRS; repair += 1) {
    const conflicted = [...paths.keys()].sort().find((id) => conflictsOf(id, paths).length > 0);
    if (conflicted === undefined) break;
    const repaired = moversFor(conflicted, paths, receiverId)
      .map((mover) => repairOne(mover, paths))
      .find((next) => next !== null);
    if (!repaired) break;
    paths = repaired;
  }
  return paths;
}
