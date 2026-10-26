import type { Point } from '../../data/types';
import type { ZoneId } from '../../data/zones';
import { PITCH_H, PITCH_W } from '../geometry/pitch';
import {
  FALLBACK_MAX_PASS_LENGTH,
  PREFERRED_MAX_PASS_LENGTH,
  rejectPass,
  type Frame,
} from './pass-validity';
import { distance, lerp } from './point';
import { receiverScore } from './receiver';
import { BODY_DISTANCE, SHAPE_MARGIN } from './shape';
import { laneOf, thirdOf, zoneOf } from './zones';

export const MAX_RECEIVER_TRAVEL = 8;
export const MAX_SUPPORT_TRAVEL = 10;
export const MAX_COVER_TRAVEL = 4;

const OPEN_MIN_PASSES = 4;
const OPEN_MAX_PASSES = 6;
const FINAL_FLANK_PASSES = 2;
const FINAL_CENTRE_PASSES = 1;
const SEARCH_BUDGET = 4000;
const OPPOSING_KEEPER_CLEARANCE = 8;
const SUPPORT_SCALES = [1, 0.75, 0.5, 0.25, 0];

const DESTINATION_OFFSETS: readonly Point[] = [
  { x: 0, y: 0 },
  { x: 0, y: -5 },
  { x: 5, y: 0 },
  { x: -5, y: 0 },
  { x: 5, y: -5 },
  { x: -5, y: -5 },
  { x: 0, y: 5 },
];

export interface PlanContext {
  startZone: ZoneId;
  teammateIds: readonly string[];
  defenderIds: readonly string[];
  targetFor: (landingZone: ZoneId, receiverId: string, receiverAt: Point) => Frame;
}

export interface PlannedPass {
  carrierId: string;
  receiverId: string;
  positions: Frame;
}

interface Candidate {
  receiverId: string;
  destination: Point;
  score: number;
  length: number;
  isReturn: boolean;
}

interface State {
  carrierId: string;
  passerId: string | null;
  positions: Frame;
  passes: readonly PlannedPass[];
}

function stepToward(from: Point, to: Point, limit: number): Point {
  const gap = distance(from, to);
  if (gap <= limit) return to;
  const share = limit / gap;
  return { x: from.x + (to.x - from.x) * share, y: from.y + (to.y - from.y) * share };
}

function isInside(point: Point): boolean {
  return (
    point.x >= SHAPE_MARGIN &&
    point.x <= PITCH_W - SHAPE_MARGIN &&
    point.y >= OPPOSING_KEEPER_CLEARANCE &&
    point.y <= PITCH_H - SHAPE_MARGIN
  );
}

function isChainComplete(startZone: ZoneId, landingZone: ZoneId, count: number): boolean {
  if (thirdOf(startZone) === 'F') {
    return count >= (laneOf(startZone) === 'C' ? FINAL_CENTRE_PASSES : FINAL_FLANK_PASSES);
  }
  if (count >= OPEN_MAX_PASSES) return true;
  return count >= OPEN_MIN_PASSES && thirdOf(landingZone) === 'F';
}

function nearestId(ids: readonly string[], frame: Frame, to: Point): string | null {
  const ranked = ids
    .map((id) => ({ id, gap: distance(frame[id], to) }))
    .sort((a, b) => a.gap - b.gap || a.id.localeCompare(b.id));
  return ranked[0]?.id ?? null;
}

function travelLimits(
  context: PlanContext,
  positions: Frame,
  receiverId: string,
  destination: Point,
): Map<string, number> {
  const responder = nearestId(context.defenderIds, positions, destination);
  return new Map(
    Object.keys(positions)
      .filter((id) => id !== receiverId)
      .map((id): [string, number] => {
        const isDefender = context.defenderIds.includes(id);
        const limit = isDefender && id !== responder ? MAX_COVER_TRAVEL : MAX_SUPPORT_TRAVEL;
        return [id, limit];
      }),
  );
}

function advance(
  context: PlanContext,
  positions: Frame,
  receiverId: string,
  destination: Point,
): Frame {
  const target = context.targetFor(zoneOf(destination, 'mine'), receiverId, positions[receiverId]);
  const limits = travelLimits(context, positions, receiverId, destination);
  return [...limits]
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce<Record<string, Point>>(
      (next, [id, limit]) => {
        const reach = stepToward(positions[id], target[id] ?? positions[id], limit);
        const point =
          SUPPORT_SCALES.map((scale) => lerp(positions[id], reach, scale)).find((candidate) =>
            Object.entries(next).every(
              ([otherId, other]) => otherId === id || distance(candidate, other) >= BODY_DISTANCE,
            ),
          ) ?? positions[id];
        return { ...next, [id]: point };
      },
      { ...positions, [receiverId]: destination },
    );
}

function candidatesOf(context: PlanContext, state: State): Candidate[] {
  const { positions, carrierId, passerId } = state;
  const carrier = positions[carrierId];
  const opponents = context.defenderIds.map((id) => positions[id]);
  return context.teammateIds
    .filter((id) => id !== carrierId)
    .flatMap((receiverId) =>
      DESTINATION_OFFSETS.map((offset) => ({
        receiverId,
        destination: {
          x: positions[receiverId].x + offset.x,
          y: positions[receiverId].y + offset.y,
        },
      })),
    )
    .filter(
      ({ receiverId, destination }) =>
        isInside(destination) &&
        distance(positions[receiverId], destination) <= MAX_RECEIVER_TRAVEL,
    )
    .map(({ receiverId, destination }) => ({
      receiverId,
      destination,
      score: receiverScore(carrier, destination, opponents),
      length: distance(carrier, destination),
      isReturn: receiverId === passerId,
    }))
    .sort(
      (a, b) =>
        Number(a.isReturn) - Number(b.isReturn) ||
        Number(a.length > PREFERRED_MAX_PASS_LENGTH) -
          Number(b.length > PREFERRED_MAX_PASS_LENGTH) ||
        b.score - a.score ||
        a.receiverId.localeCompare(b.receiverId) ||
        a.destination.x - b.destination.x ||
        a.destination.y - b.destination.y,
    );
}

function search(
  context: PlanContext,
  state: State,
  budget: { left: number },
): PlannedPass[] | null {
  if (state.passes.length >= OPEN_MAX_PASSES || budget.left <= 0) return null;
  budget.left -= 1;
  for (const candidate of candidatesOf(context, state)) {
    const { receiverId, destination } = candidate;
    const positions = advance(context, state.positions, receiverId, destination);
    const rejection = rejectPass({
      carrierId: state.carrierId,
      receiverId,
      before: state.positions,
      after: positions,
      defenderIds: context.defenderIds,
      maxLength: FALLBACK_MAX_PASS_LENGTH,
    });
    if (rejection !== null) continue;
    const passes = [...state.passes, { carrierId: state.carrierId, receiverId, positions }];
    if (isChainComplete(context.startZone, zoneOf(destination, 'mine'), passes.length)) {
      return passes;
    }
    const rest = search(
      context,
      { carrierId: receiverId, passerId: state.carrierId, positions, passes },
      budget,
    );
    if (rest) return rest;
  }
  return null;
}

export function planPasses(context: PlanContext, opening: Frame, starterId: string): PlannedPass[] {
  const state: State = { carrierId: starterId, passerId: null, positions: opening, passes: [] };
  return search(context, state, { left: SEARCH_BUDGET }) ?? [];
}
