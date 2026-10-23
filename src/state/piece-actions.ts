import type { Point, Side } from '../data/types';
import {
  PIECE_NAME_MAX_LENGTH,
  TEAM_NAME_MAX_LENGTH,
  DEFAULT_TEAM_NAMES,
  mapPlayer,
  clampToPitch,
  type PitchDocument,
  type Player,
} from './document';
import { refreshScenario } from './scenario-actions';

export function renameTeam(doc: PitchDocument, team: Side, name: string): PitchDocument {
  const next = name.trim().slice(0, TEAM_NAME_MAX_LENGTH).trim() || DEFAULT_TEAM_NAMES[team];
  if (doc.teams[team].name === next) return doc;
  return { ...doc, teams: { ...doc.teams, [team]: { ...doc.teams[team], name: next } } };
}

export function setPieceName(doc: PitchDocument, playerId: string, name: string): PitchDocument {
  const next = name.trim().slice(0, PIECE_NAME_MAX_LENGTH).trim();
  return mapPlayer(doc, playerId, (player) => {
    if ((player.customName ?? '') === next) return player;
    const { customName: _previous, ...rest } = player;
    return next ? { ...rest, customName: next } : rest;
  });
}

export function movePlayer(doc: PitchDocument, playerId: string, point: Point): PitchDocument {
  const base = clampToPitch(point);
  const moved = mapPlayer(doc, playerId, (player): Player => {
    const unchanged = player.base?.x === base.x && player.base?.y === base.y;
    return unchanged ? player : { ...player, base };
  });
  return moved === doc ? doc : refreshScenario(moved);
}

export function benchPlayer(doc: PitchDocument, playerId: string): PitchDocument {
  const target = doc.players.find((player) => player.id === playerId);
  if (!target || target.base === undefined) return doc;
  const { base: _base, ...benched } = target;
  const players = doc.players.map((player) => (player === target ? benched : player));
  return refreshScenario({ ...doc, players });
}

export function clearPitch(doc: PitchDocument): PitchDocument {
  return doc.players.reduce((current, player) => benchPlayer(current, player.id), doc);
}
