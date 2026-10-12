import type { Point, Side } from '../../data/types';
import { positionAt } from '../anim/interpolate';
import { enforceSpacing, type SpacingToken } from '../layout/spacing';
import { PITCH_TARGET_MARGIN, targetFor, type MovementTables } from './movement';
import { computeZoneShape } from './shape';
import { ZONE_GRID, zoneOf, type ZoneGrid } from './zones';

export type Phase = 'shape' | 'runs' | 'final';

export const PHASES: readonly Phase[] = ['shape', 'runs', 'final'];

export const PHASE_PROGRESS: Record<Phase, number> = { shape: 0, runs: 0.5, final: 1 };

export type PhaseStatus = 'ready' | 'setup-not-finished';

export type PhasePositions = Record<Phase, Map<string, Point>>;

export interface PhaseResult {
  status: PhaseStatus;
  positions: PhasePositions;
}

export interface PhasePlayer {
  id: string;
  team: Side;
  base: Point;
  roleId?: string;
  isKeeper: boolean;
}

export interface PhaseInput {
  attacker: Side;
  players: readonly PhasePlayer[];
  ball: Point;
  carrierId: string | null;
  tables: MovementTables;
  grid?: ZoneGrid;
}

function separate(
  positions: ReadonlyMap<string, Point>,
  carrierId: string | null,
  fixedIds: ReadonlySet<string>,
): Map<string, Point> {
  const tokens = Array.from(
    positions,
    ([id, point]): SpacingToken => ({
      id,
      point,
      fixed: id === carrierId || fixedIds.has(id),
    }),
  );
  return enforceSpacing(tokens, { margin: PITCH_TARGET_MARGIN });
}

function holdShape(shape: ReadonlyMap<string, Point>): PhaseResult {
  const copy = () => new Map(shape);
  return {
    status: 'setup-not-finished',
    positions: { shape: copy(), runs: copy(), final: copy() },
  };
}

export function computePhases(input: PhaseInput): PhaseResult {
  const { attacker, players, ball, carrierId, tables, grid = ZONE_GRID } = input;
  const zone = zoneOf(ball, attacker, grid);
  const fixedIds = new Set(players.filter((player) => player.isKeeper).map((player) => player.id));
  const shape = computeZoneShape({
    attacker,
    players,
    ball,
    carrierId,
    zone,
    grid,
    shapeLineShift: tables.shapeLineShift,
  });
  const goals = new Map<string, Point>();
  for (const player of players) {
    if (player.id === carrierId) {
      goals.set(player.id, ball);
      continue;
    }
    const result = targetFor({
      base: player.base,
      start: shape.get(player.id)!,
      team: player.team,
      attacker,
      roleId: player.roleId,
      isKeeper: player.isKeeper,
      zone,
      tables,
      grid,
    });
    if (result.status === 'setup-not-finished') return holdShape(shape);
    goals.set(player.id, result.target);
  }
  const final = separate(goals, carrierId, fixedIds);
  const runs = separate(
    new Map(
      players.map((player) => [
        player.id,
        positionAt(shape.get(player.id)!, final.get(player.id)!, PHASE_PROGRESS.runs),
      ]),
    ),
    carrierId,
    fixedIds,
  );
  return { status: 'ready', positions: { shape, runs, final } };
}
