import type { Point } from '../../data/types';
import { PITCH_H, PITCH_W } from '../geometry/pitch';

export const SHAPE_MARGIN = 2.4;
export const FIRST_SEARCH_RADIUS = 3;
export const EXPANDED_SEARCH_RADIUS = 6;

const SEARCH_STEP = 0.5;
const RANK_GAP = 1;
const CENTRE_X = PITCH_W / 2;
const EPSILON = 1e-9;
const CROWD_RADIUS = 10;

export interface ResolveToken {
  id: string;
  point: Point;
  fixed?: boolean;
  group?: string;
  rank?: number;
}

export interface ResolveOptions {
  minDistance: (a: string, b: string) => number;
}

function offsetsWithin(radius: number): Point[] {
  const steps = Math.round(radius / SEARCH_STEP);
  const values = Array.from({ length: 2 * steps + 1 }, (_, index) => (index - steps) * SEARCH_STEP);
  return values
    .flatMap((dx) => values.map((dy) => ({ x: dx, y: dy })))
    .filter((offset) => Math.hypot(offset.x, offset.y) <= radius + EPSILON);
}

function searchOrder(radius: number, towardCentre: 1 | -1): Point[] {
  const kind = (offset: Point) => (offset.y === 0 ? 0 : offset.x === 0 ? 1 : 2);
  return offsetsWithin(radius).sort(
    (a, b) =>
      kind(a) - kind(b) ||
      Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y) ||
      Math.abs(a.x) - Math.abs(b.x) ||
      towardCentre * (b.x - a.x) ||
      b.y - a.y,
  );
}

const SEARCH_ORDERS = [FIRST_SEARCH_RADIUS, EXPANDED_SEARCH_RADIUS].map((radius) => ({
  left: searchOrder(radius, 1),
  right: searchOrder(radius, -1),
}));

function inBounds(point: Point): boolean {
  return (
    point.x >= SHAPE_MARGIN - EPSILON &&
    point.x <= PITCH_W - SHAPE_MARGIN + EPSILON &&
    point.y >= SHAPE_MARGIN - EPSILON &&
    point.y <= PITCH_H - SHAPE_MARGIN + EPSILON
  );
}

function prefersLeftOrder(token: ResolveToken, placed: ReadonlyMap<string, Point>): boolean {
  const lean = token.point.x - CENTRE_X;
  if (Math.abs(lean) > EPSILON) return lean < 0;
  const crowd = [...placed.values()]
    .filter((other) => Math.hypot(other.x - token.point.x, other.y - token.point.y) <= CROWD_RADIUS)
    .reduce((sum, other) => sum + (other.x - CENTRE_X), 0);
  return crowd <= 0;
}

export function resolveCollisions(
  tokens: readonly ResolveToken[],
  options: ResolveOptions,
): Map<string, Point> {
  const placed = new Map<string, Point>();
  const byId = new Map(tokens.map((token) => [token.id, token]));

  const isFree = (token: ResolveToken, point: Point): boolean => {
    if (!inBounds(point)) return false;
    for (const [otherId, other] of placed) {
      if (
        Math.hypot(point.x - other.x, point.y - other.y) < options.minDistance(token.id, otherId)
      ) {
        return false;
      }
      const peer = byId.get(otherId)!;
      if (token.group !== undefined && peer.group === token.group) {
        const leftOfPeer = (token.rank ?? 0) < (peer.rank ?? 0);
        const dx = leftOfPeer ? other.x - point.x : point.x - other.x;
        if (dx < RANK_GAP) return false;
      }
    }
    return true;
  };

  for (const token of tokens.filter((item) => item.fixed)) placed.set(token.id, token.point);

  for (const token of tokens.filter((item) => !item.fixed)) {
    const found = SEARCH_ORDERS.reduce<Point | null>((result, orders) => {
      if (result) return result;
      const order = prefersLeftOrder(token, placed) ? orders.left : orders.right;
      const offset = order.find((candidate) =>
        isFree(token, { x: token.point.x + candidate.x, y: token.point.y + candidate.y }),
      );
      return offset ? { x: token.point.x + offset.x, y: token.point.y + offset.y } : null;
    }, null);
    placed.set(token.id, found ?? token.point);
  }

  return placed;
}
