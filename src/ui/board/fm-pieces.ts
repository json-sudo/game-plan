import type { Point, Side } from '../../data/types';
import { FM26_DATA } from '../../data/fm26';
import { PITCH_H } from '../../engine';
import { pieceLabel } from '../../state/bench-pieces';
import { activeRoleOf } from '../../state/context';
import { isSetupComplete, type PitchDocument } from '../../state/document';
import type { FmVisualization } from '../../state/visualization';
import {
  PITCH_EMPTY_SETUP,
  PITCH_EMPTY_ZONE,
  RESET_DISABLED_REASON,
  RESET_FM_REASON,
  VISUALIZATION_SETUP_FIRST_REASON,
  VISUALIZATION_ZONE_FIRST_REASON,
} from '../copy';
import type { SequenceControlsProps } from '../instrument/SequenceControls';
import type { SetupCursor } from '../setup/setup-model';

export function fmWantedPieces(
  doc: PitchDocument,
  viz: FmVisualization | null,
  frame = 0,
): Map<string, Point> {
  if (!doc.scenario || !viz) return new Map();
  const { positions } = viz.frames[frame];
  return new Map(
    doc.players.flatMap((player) => {
      const point = positions[`${player.team}:${player.slot}`];
      return point ? [[player.id, point] as const] : [];
    }),
  );
}

export function visualizationStarter(doc: PitchDocument, viz: FmVisualization): string | null {
  const player = doc.players.find(
    (candidate) => `${candidate.team}:${candidate.slot}` === viz.starterId,
  );
  if (!player) return null;
  const roleId = activeRoleOf(doc, player, FM26_DATA);
  const role = FM26_DATA.roles.find((candidate) => candidate.id === roleId)?.name;
  const slot = pieceLabel(doc, player, FM26_DATA);
  return role ? `${slot} · ${role}` : slot;
}

export function visualizationControls(
  doc: PitchDocument,
  viz: FmVisualization | null,
): Pick<SequenceControlsProps, 'starter' | 'total' | 'disabled' | 'reason'> {
  if (viz) {
    return { starter: visualizationStarter(doc, viz) ?? undefined, total: viz.total };
  }
  return {
    disabled: true,
    reason: isSetupComplete(doc)
      ? VISUALIZATION_ZONE_FIRST_REASON
      : VISUALIZATION_SETUP_FIRST_REASON,
  };
}

export function resetState(doc: PitchDocument, fm: boolean): { enabled: boolean; reason: string } {
  if (fm) return { enabled: doc.scenario !== null, reason: RESET_FM_REASON };
  return {
    enabled: doc.teams.mine.applied !== null || doc.teams.opponent.applied !== null,
    reason: RESET_DISABLED_REASON,
  };
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
