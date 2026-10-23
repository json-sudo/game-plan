import type { Point, Side } from '../../data/types';
import { PITCH_H } from '../../engine';
import type { PitchDocument } from '../../state/document';
import type { FmVisualization } from '../../state/visualization';
import { PITCH_EMPTY_SETUP, PITCH_EMPTY_ZONE } from '../copy';
import type { SetupCursor } from '../setup/setup-model';

export function fmWantedPieces(
  doc: PitchDocument,
  viz: FmVisualization | null,
): Map<string, Point> {
  if (!doc.scenario || !viz) return new Map();
  const { positions } = viz.frames[0];
  return new Map(
    doc.players.flatMap((player) => {
      const point = positions[`${player.team}:${player.slot}`];
      return point ? [[player.id, point] as const] : [];
    }),
  );
}

export function fmPitchNotice(cursor: SetupCursor): string {
  return cursor === null ? PITCH_EMPTY_ZONE : PITCH_EMPTY_SETUP;
}

export function opponentOnPitch(doc: PitchDocument): boolean {
  return doc.teams.opponent.formationId !== null;
}

export function goalLinePoint(point: Pick<Point, 'x'>, team: Side, attacker: Side): Point {
  return { x: point.x, y: team === attacker ? PITCH_H : 0 };
}

export function goalLinePieces(
  pieces: ReadonlyMap<string, Point>,
  doc: PitchDocument,
): Map<string, Point> {
  const teams = new Map(doc.players.map((player) => [player.id, player.team]));
  return new Map(
    Array.from(pieces, ([id, point]) => [id, goalLinePoint(point, teams.get(id)!, doc.attacker)]),
  );
}
