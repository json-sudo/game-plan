import type { DataSet } from '../data/types';
import type { ZoneId } from '../data/zones';
import { eligibleCarrierIds, type CarrierPlayer } from '../engine';
import { activeRoleOf, attackersOf } from './context';
import { formationOf, playerSide, type PitchDocument } from './document';

export function eligibleCarrierIdsOf(doc: PitchDocument, zone: ZoneId, data: DataSet): string[] {
  const formation = formationOf(data, doc.teams[doc.attacker].formationId);
  if (!formation) return [];
  const players = attackersOf(doc).map((player): CarrierPlayer => ({
    id: player.id,
    roleId: activeRoleOf(doc, player, data),
    family: player.family,
    slot: player.slot,
    side: playerSide(player),
  }));
  return eligibleCarrierIds(zone, players, formation.slots);
}
