import type { DataSet } from '../../data/types';
import { zoneOf } from '../../engine';
import { activeRoleOf } from '../../state/context';
import { pieceLabel } from '../../state/bench-pieces';
import type { PitchDocument } from '../../state/document';
import { eligibleCarrierIdsOf } from '../../state/eligible-carriers';
import type { CarrierOption } from '../instrument/CarrierPicker';

export function carrierOptionsOf(doc: PitchDocument, data: DataSet): CarrierOption[] {
  const eligible = eligibleCarrierIdsOf(doc, zoneOf(doc.ball, doc.attacker), data);
  const carrierId = doc.scenario?.carrierId;
  const ids = carrierId && !eligible.includes(carrierId) ? [carrierId, ...eligible] : eligible;
  return ids.flatMap((id) => {
    const player = doc.players.find((candidate) => candidate.id === id);
    const roleId = player ? activeRoleOf(doc, player, data) : undefined;
    const role = data.roles.find((candidate) => candidate.id === roleId);
    return player && role ? [{ id, label: pieceLabel(doc, player, data), role: role.name }] : [];
  });
}
