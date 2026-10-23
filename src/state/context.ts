import type { DataSet } from '../data/types';
import { isRoleValidFor, type PitchDocument, type Player } from './document';

export function activeRoleOf(
  doc: PitchDocument,
  player: Player,
  data: DataSet,
): string | undefined {
  return player.role && isRoleValidFor(doc, data, player, player.role) ? player.role : undefined;
}
