import type { DataSet, Family, FormationDef, Side } from '../data/types';
import { formationOf, playersOf, SIDES, type PitchDocument, type Player } from './document';

export const DEFAULT_BENCH_FORMATIONS: Record<Side, string> = {
  mine: '4_3_3_dm_wide',
  opponent: '4_2_3_1_dm_wide',
};
export const GOALKEEPER_LABEL: Family = 'GK';
export const SPARE_LABEL_PREFIX = 's';

export interface BenchEntry {
  id: string;
  label: string;
  team: Side;
  keeper: boolean;
  name: string | undefined;
  order: number;
}

function labellingFormation(doc: PitchDocument, team: Side, data: DataSet): FormationDef | null {
  return (
    formationOf(data, doc.teams[team].formationId) ??
    formationOf(data, DEFAULT_BENCH_FORMATIONS[team])
  );
}

function rosterLabel(formation: FormationDef | null, index: number): string {
  const slots = formation?.slots ?? [];
  return index < slots.length
    ? slots[index].family
    : `${SPARE_LABEL_PREFIX}${index - slots.length + 1}`;
}

export function pieceLabel(doc: PitchDocument, player: Player, data: DataSet): string {
  const index = playersOf(doc, player.team).findIndex((member) => member.id === player.id);
  return (
    player.family ?? player.slot ?? rosterLabel(labellingFormation(doc, player.team, data), index)
  );
}

export function benchPieces(doc: PitchDocument, data: DataSet): BenchEntry[] {
  return SIDES.flatMap((team) =>
    playersOf(doc, team).flatMap((player, index) =>
      player.base
        ? []
        : [
            {
              id: player.id,
              label: pieceLabel(doc, player, data),
              team,
              keeper: player.isKeeper,
              name: player.customName,
              order: index,
            },
          ],
    ),
  );
}
