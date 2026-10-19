import type { DataSet, FormationDef, Side } from '../data/types';
import { EXAMPLE_FORMATIONS } from './example';
import { formationOf, playerLabel, playersOf, SIDES, type PitchDocument } from './document';

export const DEFAULT_BENCH_FORMATIONS: Record<Side, string> = EXAMPLE_FORMATIONS;
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

export function benchPieces(doc: PitchDocument, data: DataSet): BenchEntry[] {
  return SIDES.flatMap((team) => {
    const formation = labellingFormation(doc, team, data);
    return playersOf(doc, team).flatMap((player, index) =>
      player.base
        ? []
        : [
            {
              id: player.id,
              label:
                player.family || player.slot ? playerLabel(player) : rosterLabel(formation, index),
              team,
              keeper: player.isKeeper,
              name: player.customName,
              order: index,
            },
          ],
    );
  });
}
