import type { Point, Side } from '../../data/types';
import { positionAt } from '../anim/interpolate';
import { type MovementTables, targetFor } from './movement';
import { ZONE_GRID, zoneOf, type ZoneGrid } from './zones';

export type Phase = 'shape' | 'runs' | 'final';

export const PHASES: readonly Phase[] = ['shape', 'runs', 'final'];

export const PHASE_PROGRESS: Record<Phase, number> = { shape: 0, runs: 0.5, final: 1 };

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

export function computeTargets(input: PhaseInput): Map<string, Point> {
  const { attacker, players, ball, carrierId, tables, grid = ZONE_GRID } = input;
  const zone = zoneOf(ball, attacker, grid);
  return new Map(
    players.map((player) => [
      player.id,
      player.id === carrierId
        ? ball
        : targetFor({
            base: player.base,
            team: player.team,
            attacker,
            roleId: player.roleId,
            isKeeper: player.isKeeper,
            zone,
            tables,
            grid,
          }),
    ]),
  );
}

export function computePhases(input: PhaseInput): Record<Phase, Map<string, Point>> {
  const targets = computeTargets(input);
  const phaseMap = (phase: Phase) =>
    new Map(
      input.players.map((player) => [
        player.id,
        player.id === input.carrierId
          ? input.ball
          : positionAt(player.base, targets.get(player.id) ?? player.base, PHASE_PROGRESS[phase]),
      ]),
    );
  return { shape: phaseMap('shape'), runs: phaseMap('runs'), final: phaseMap('final') };
}
