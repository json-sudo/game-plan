import type { DataSet } from '../data/types';
import type { ZoneId } from '../data/zones';
import { eligibleCarrierIds, visualizationStarters, type CarrierPlayer } from '../engine';
import { activeRoleOf, attackersOf } from './context';
import { formationOf, playerSide, type PitchDocument } from './document';

function carrierPlayersOf(doc: PitchDocument, data: DataSet): CarrierPlayer[] {
  return attackersOf(doc).map((player): CarrierPlayer => ({
    id: player.id,
    roleId: activeRoleOf(doc, player, data),
    family: player.family,
    slot: player.slot,
    side: playerSide(player),
  }));
}

export function eligibleCarrierIdsOf(doc: PitchDocument, zone: ZoneId, data: DataSet): string[] {
  const formation = formationOf(data, doc.teams[doc.attacker].formationId);
  if (!formation) return [];
  return eligibleCarrierIds(zone, carrierPlayersOf(doc, data), formation.slots);
}

export function visualizationStartersOf(doc: PitchDocument, zone: ZoneId, data: DataSet): string[] {
  const formation = formationOf(data, doc.teams[doc.attacker].formationId);
  if (!formation) return [];
  return visualizationStarters(zone, carrierPlayersOf(doc, data), formation.slots);
}
