import type { DataSet } from '../../data/types';
import { activeRoleOf, attackersOf } from '../../state/context';
import { pieceLabel } from '../../state/bench-pieces';
import type { PitchDocument } from '../../state/document';
import type { CarrierOption } from '../instrument/CarrierPicker';

export function passOptionsOf(doc: PitchDocument, data: DataSet): CarrierOption[] {
  const carrierId = doc.scenario?.carrierId;
  if (!carrierId) return [];
  return attackersOf(doc)
    .filter((player) => player.id !== carrierId)
    .flatMap((player) => {
      const roleId = activeRoleOf(doc, player, data);
      const role = data.roles.find((candidate) => candidate.id === roleId);
      return role ? [{ id: player.id, label: pieceLabel(doc, player, data), role: role.name }] : [];
    });
}
