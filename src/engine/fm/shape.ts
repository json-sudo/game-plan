import type { Point, Side } from '../../data/types';
import type { ZoneId } from '../../data/zones';
import { formationAnchors } from './formation-anchors';
import type { FmPlayer } from './player';
import { SHAPE_MARGIN, resolveCollisions, type ResolveToken } from './shape-resolve';
import { toDisplayFrame } from './zones';

export { SHAPE_MARGIN };

const PLAYER_RADIUS = 2.2;
const BODY_GAP = 0.25;
const BODY_DISTANCE = 2 * PLAYER_RADIUS + BODY_GAP;
const LOOSE_BALL_SPACING = 6;
const BALL_ID = 'ball';

export interface ShapeInput {
  attacker: Side;
  players: readonly FmPlayer[];
  ball: Point;
  carrierId: string | null;
  zone: ZoneId;
}

export interface ZoneShape {
  positions: Map<string, Point>;
  ball: Point;
}

export function computeZoneShape(input: ShapeInput): ZoneShape {
  const { attacker, players, ball, carrierId, zone } = input;
  const frameBall = toDisplayFrame(ball, attacker);
  const hasCarrier = players.some((player) => player.team === attacker && player.id === carrierId);
  const anchors = formationAnchors({ attacker, players, zone });
  const playerTokens = players.map((player): ResolveToken => {
    const anchor = anchors.get(player.id)!;
    if (player.isKeeper) return { id: player.id, point: anchor.point, fixed: true };
    if (player.team === attacker && player.id === carrierId) {
      return { id: player.id, point: frameBall, fixed: true };
    }
    return {
      id: player.id,
      point: anchor.point,
      group: `${player.team}:${anchor.line}`,
      rank: toDisplayFrame(player.base, attacker).x,
    };
  });
  const attackerIds = new Set(
    players.filter((player) => player.team === attacker).map((player) => player.id),
  );
  const tokenOrder = (a: ResolveToken, b: ResolveToken) =>
    Number(attackerIds.has(b.id)) - Number(attackerIds.has(a.id)) ||
    a.point.x - b.point.x ||
    a.point.y - b.point.y ||
    a.id.localeCompare(b.id);
  const looseBall: ResolveToken[] = hasCarrier
    ? []
    : [{ id: BALL_ID, point: frameBall, fixed: true }];
  const settled = resolveCollisions([...[...playerTokens].sort(tokenOrder), ...looseBall], {
    minDistance: (a, b) => (a === BALL_ID || b === BALL_ID ? LOOSE_BALL_SPACING : BODY_DISTANCE),
  });
  return {
    positions: new Map<string, Point>(
      players.map((player) => [player.id, toDisplayFrame(settled.get(player.id)!, attacker)]),
    ),
    ball,
  };
}
