import type { DataSet, Side } from '../data/types';
import {
  defaultRoleFor,
  isRoleValidFor,
  possessionOf,
  type BoardDocument,
  type Player,
} from './document';
import { refreshScenario } from './scenario-actions';

function withRole(player: Player, role: string | undefined): Player {
  const { role: _previous, ...rest } = player;
  return role === undefined ? rest : { ...rest, role };
}

function mapPlayers(doc: BoardDocument, update: (player: Player) => Player): BoardDocument {
  const players = doc.players.map(update);
  return players.every((player, index) => player === doc.players[index])
    ? doc
    : { ...doc, players };
}

export function reconcileRoles(doc: BoardDocument, data: DataSet): BoardDocument {
  return mapPlayers(doc, (player) => {
    if (player.role === undefined) return player;
    const possession = possessionOf(doc, player.team);
    if (isRoleValidFor(data, player.role, player.family, possession)) return player;
    return withRole(player, defaultRoleFor(data, player.family, possession));
  });
}

export function fillDefaultRoles(doc: BoardDocument, data: DataSet): BoardDocument {
  return mapPlayers(reconcileRoles(doc, data), (player) => {
    if (player.role !== undefined || player.base === undefined) return player;
    const role = defaultRoleFor(data, player.family, possessionOf(doc, player.team));
    return role === undefined ? player : withRole(player, role);
  });
}

export function setRole(
  doc: BoardDocument,
  playerId: string,
  roleId: string | null,
  data: DataSet,
): BoardDocument {
  const target = doc.players.find((player) => player.id === playerId);
  if (!target) return doc;
  if (roleId === null)
    return mapPlayers(doc, (player) => (player === target ? withRole(player, undefined) : player));
  if (!isRoleValidFor(data, roleId, target.family, possessionOf(doc, target.team))) return doc;
  return mapPlayers(doc, (player) => (player === target ? withRole(player, roleId) : player));
}

export function setAttacker(doc: BoardDocument, attacker: Side, data: DataSet): BoardDocument {
  if (doc.attacker === attacker) return doc;
  return refreshScenario(reconcileRoles({ ...doc, attacker }, data));
}
