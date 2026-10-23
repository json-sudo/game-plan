import { FM26_DATA } from '../../data/fm26';
import type { Point } from '../../data/types';
import { zoneName } from '../../engine';
import { pieceLabel } from '../../state/bench-pieces';
import { activeRoleOf } from '../../state/context';
import { playerSide, type PitchDocument } from '../../state/document';
import type { ExportFrameProps } from '../export/ExportFrame';
import { EXPORT_TOKEN_SCALE } from '../export/export-size';
import { opponentOnPitch } from './fm-pieces';

export interface ExportSnapshot {
  doc: PitchDocument;
  pieces: ReadonlyMap<string, Point>;
  ball: Point | null;
  fm: boolean;
  showRole: boolean;
  tokenPx: number;
}

export function exportFrameProps(snapshot: ExportSnapshot): ExportFrameProps {
  const { doc, pieces, ball, fm, showRole, tokenPx } = snapshot;
  const tokens = doc.players.flatMap((player) => {
    const point = pieces.get(player.id);
    if (!point) return [];
    const roleId = fm ? activeRoleOf(doc, player, FM26_DATA) : undefined;
    const role = FM26_DATA.roles.find((candidate) => candidate.id === roleId)?.name;
    return [
      {
        id: player.id,
        x: point.x,
        y: point.y,
        team: player.team,
        keeper: player.isKeeper,
        label: pieceLabel(doc, player, FM26_DATA),
        side: playerSide(player),
        role: showRole ? role : undefined,
      },
    ];
  });
  return {
    mine: doc.teams.mine.name,
    opponent: !fm || opponentOnPitch(doc) ? doc.teams.opponent.name : undefined,
    zoneName: fm && doc.scenario ? zoneName(doc.scenario.zone) : undefined,
    tokens,
    ball: ball ?? undefined,
    tokenPx: tokenPx * EXPORT_TOKEN_SCALE,
  };
}
