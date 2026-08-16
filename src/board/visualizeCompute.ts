import { PITCH_H, PITCH_W } from './pitchGeometry';
import type { BoardState, Piece, Team } from './types';
import type { VisualizeAction } from './visualizeActions';
import type { DribbleDirection } from './VisualizeContext';

export type Role = 'fullback' | 'centerBack' | 'midfielder' | 'winger' | 'striker' | 'keeper';

export interface VisualizeSelections {
  attacker: Team;
  carrierId: string;
  action: VisualizeAction;
  passTargetId?: string | null;
  dribbleDirection?: DribbleDirection | null;
}

export type VisualizeOutcome = Map<string, { x: number; y: number }>;

const LABEL_TO_ROLE: Record<string, Role> = {
  LB: 'fullback',
  RB: 'fullback',
  CB: 'centerBack',
  CM: 'midfielder',
  DM: 'midfielder',
  LW: 'winger',
  RW: 'winger',
  ST: 'striker',
  GK: 'keeper',
};

function roleForLabel(label: string): Role {
  return LABEL_TO_ROLE[label] ?? 'midfielder';
}

export const DRIBBLE_DISTANCE: Record<Role, number> = {
  fullback: 8,
  centerBack: 6,
  midfielder: 9,
  winger: 11,
  striker: 10,
  keeper: 0,
};

export const ROLE_ALLOWED_DRIBBLE_DIRECTIONS: Record<Role, DribbleDirection[]> = {
  fullback: ['forward', 'left', 'right'],
  centerBack: ['forward', 'left', 'right'],
  midfielder: ['forward', 'left', 'right', 'back'],
  winger: ['forward', 'left', 'right'],
  striker: ['forward', 'left', 'right'],
  keeper: [],
};

export const DEFENDER_DRIBBLE_DISTANCE: Record<Role, number> = {
  fullback: 4,
  centerBack: 3,
  midfielder: 4,
  winger: 5,
  striker: 5,
  keeper: 0,
};

export const DEFENDER_ROLE_ALLOWED_DRIBBLE_DIRECTIONS: Record<Role, DribbleDirection[]> = {
  fullback: ['forward'],
  centerBack: ['forward'],
  midfielder: ['forward', 'back'],
  winger: ['forward'],
  striker: ['forward'],
  keeper: [],
};

export const NEAR_PLAY_RADIUS = 20;
export const NEAR_PLAY_REACTION_DISTANCE = 5;
export const DISTANT_REACTION_DISTANCE = 1.5;
export const ATTACKING_NEAR_PLAY_REACTION_DISTANCE = 7;
export const ATTACKING_DISTANT_REACTION_DISTANCE = 2.5;

export const SHOOT_ADVANCE = 8;
export const CLEAR_ADVANCE = 8;

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

const DISTANCE_EPSILON = 1 - 1e-9;

function moveToward(
  from: { x: number; y: number },
  to: { x: number; y: number },
  distance: number,
): { x: number; y: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return { x: from.x, y: from.y };
  const scale = (distance * DISTANCE_EPSILON) / len;
  return { x: from.x + dx * scale, y: from.y + dy * scale };
}

function moveAway(
  from: { x: number; y: number },
  away: { x: number; y: number },
  distance: number,
): { x: number; y: number } {
  const dx = from.x - away.x;
  const dy = from.y - away.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return { x: from.x, y: from.y };
  const scale = (distance * DISTANCE_EPSILON) / len;
  return { x: from.x + dx * scale, y: from.y + dy * scale };
}

function directionVector(team: Team, direction: DribbleDirection): { x: number; y: number } {
  const forwardY = team === 'mine' ? -1 : 1;
  switch (direction) {
    case 'forward':
      return { x: 0, y: forwardY };
    case 'back':
      return { x: 0, y: -forwardY };
    case 'left':
      return { x: -1, y: 0 };
    case 'right':
      return { x: 1, y: 0 };
  }
}

export function computeVisualizeOutcome(
  board: BoardState,
  selections: VisualizeSelections,
): VisualizeOutcome {
  const placed = board.pieces.filter((p) => p.position !== undefined) as (Piece & {
    position: { x: number; y: number };
  })[];

  const outcome: VisualizeOutcome = new Map();
  for (const piece of placed) {
    outcome.set(piece.id, { x: piece.position.x, y: piece.position.y });
  }

  const carrier = placed.find((p) => p.id === selections.carrierId);
  if (!carrier) return outcome;

  const carrierStart = carrier.position;
  let carrierEnd = carrierStart;

  const carrierIsAttacker = carrier.team === selections.attacker;

  if (selections.action === 'dribble') {
    const role = roleForLabel(carrier.label);
    const direction = selections.dribbleDirection;
    const distances = carrierIsAttacker ? DRIBBLE_DISTANCE : DEFENDER_DRIBBLE_DISTANCE;
    const arcs = carrierIsAttacker
      ? ROLE_ALLOWED_DRIBBLE_DIRECTIONS
      : DEFENDER_ROLE_ALLOWED_DRIBBLE_DIRECTIONS;
    const allowed = arcs[role];
    if (direction && allowed.includes(direction) && role !== 'keeper') {
      const vec = directionVector(carrier.team, direction);
      carrierEnd = {
        x: carrierStart.x + vec.x * distances[role],
        y: carrierStart.y + vec.y * distances[role],
      };
    }
  } else if (selections.action === 'shoot') {
    const attackingGoal =
      carrier.team === 'mine' ? { x: PITCH_W / 2, y: 0 } : { x: PITCH_W / 2, y: PITCH_H };
    carrierEnd = moveToward(carrierStart, attackingGoal, SHOOT_ADVANCE);
  } else if (selections.action === 'clear') {
    const ownGoal =
      carrier.team === 'mine' ? { x: PITCH_W / 2, y: PITCH_H } : { x: PITCH_W / 2, y: 0 };
    carrierEnd = moveAway(carrierStart, ownGoal, CLEAR_ADVANCE);
  }

  if (carrier.label !== 'GK') {
    outcome.set(carrier.id, carrierEnd);
  }

  const referencePoints: { x: number; y: number }[] = [carrierStart];
  if (selections.action === 'pass' && selections.passTargetId) {
    const target = placed.find((p) => p.id === selections.passTargetId);
    if (target) referencePoints.push(target.position);
  }

  for (const piece of placed) {
    if (piece.id === carrier.id || piece.type === 'ball' || piece.label === 'GK') continue;

    const isAttackingSide = piece.team === selections.attacker;
    const nearDistance = isAttackingSide
      ? ATTACKING_NEAR_PLAY_REACTION_DISTANCE
      : NEAR_PLAY_REACTION_DISTANCE;
    const farDistance = isAttackingSide
      ? ATTACKING_DISTANT_REACTION_DISTANCE
      : DISTANT_REACTION_DISTANCE;

    const nearestRef = Math.min(...referencePoints.map((ref) => dist(piece.position, ref)));
    const isNear = nearestRef <= NEAR_PLAY_RADIUS;
    const reactionDistance = isNear ? nearDistance : farDistance;

    const towardPoint = referencePoints.reduce((closest, ref) =>
      dist(piece.position, ref) < dist(piece.position, closest) ? ref : closest,
    );
    outcome.set(piece.id, moveToward(piece.position, towardPoint, reactionDistance));
  }

  if (selections.action === 'pass' && selections.passTargetId) {
    const targetEnd = outcome.get(selections.passTargetId);
    if (targetEnd) outcome.set('ball', targetEnd);
  } else {
    outcome.set('ball', outcome.get(carrier.id) ?? carrierEnd);
  }

  return outcome;
}
