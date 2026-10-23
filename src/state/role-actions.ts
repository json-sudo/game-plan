import type { DataSet, Side } from '../data/types';
import {
  defaultRoleFor,
  isRoleValidFor,
  possessionOf,
  type PitchDocument,
  type Player,
} from './document';
import { refreshScenario } from './scenario-actions';

function withRole(player: Player, role: string | undefined): Player {
  const { role: _previous, ...rest } = player;
  return role === undefined ? rest : { ...rest, role };
}

function mapPlayers(doc: PitchDocument, update: (player: Player) => Player): PitchDocument {
  const players = doc.players.map(update);
  return players.every((player, index) => player === doc.players[index])
    ? doc
    : { ...doc, players };
}

export function reconcileRoles(doc: PitchDocument, data: DataSet): PitchDocument {
  return mapPlayers(doc, (player) => {
    if (player.role === undefined) return player;
    if (isRoleValidFor(doc, data, player, player.role)) return player;
    return withRole(player, defaultRoleFor(data, player.family, possessionOf(doc, player.team)));
  });
}

export function fillDefaultRoles(doc: PitchDocument, data: DataSet): PitchDocument {
  return mapPlayers(reconcileRoles(doc, data), (player) => {
    if (player.role !== undefined || player.base === undefined) return player;
    const role = defaultRoleFor(data, player.family, possessionOf(doc, player.team));
    return role === undefined ? player : withRole(player, role);
  });
}

export function setRole(
  doc: PitchDocument,
  playerId: string,
  roleId: string | null,
  data: DataSet,
): PitchDocument {
  const target = doc.players.find((player) => player.id === playerId);
  if (!target) return doc;
  if (roleId !== null && !isRoleValidFor(doc, data, target, roleId)) return doc;
  return mapPlayers(doc, (player) =>
    player === target ? withRole(player, roleId ?? undefined) : player,
  );
}

export function setAttacker(doc: PitchDocument, attacker: Side, data: DataSet): PitchDocument {
  if (doc.attacker === attacker) return doc;
  return refreshScenario(reconcileRoles({ ...doc, attacker }, data));
}
