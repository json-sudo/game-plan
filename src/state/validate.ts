import type { DataSet, Point } from '../data/types';
import { ZONE_IDS } from '../data/zones';
import { PITCH_H, PITCH_W } from '../engine';
import {
  PIECE_NAME_MAX_LENGTH,
  SIDES,
  TEAM_NAME_MAX_LENGTH,
  formationOf,
  isRoleValidFor,
  type PitchDocument,
  type Player,
} from './document';

export const MAX_PIECES_PER_TEAM = 27;

function insidePitch(point: Point): boolean {
  return point.x >= 0 && point.x <= PITCH_W && point.y >= 0 && point.y <= PITCH_H;
}

function playerIssue(doc: PitchDocument, player: Player, data: DataSet): string | null {
  if (player.base && !insidePitch(player.base)) return `${player.id} is outside the pitch`;
  if (player.customName && player.customName.length > PIECE_NAME_MAX_LENGTH) {
    return `${player.id} has a piece name that is too long`;
  }
  const formation = formationOf(data, doc.teams[player.team].formationId);
  if (player.slot !== null) {
    const slot = formation?.slots.find((candidate) => candidate.id === player.slot);
    if (!slot) return `${player.id} has a slot outside its team formation`;
    if (slot.family !== player.family) return `${player.id} does not match its slot family`;
  }
  if (player.role !== undefined && !isRoleValidFor(doc, data, player, player.role)) {
    return `${player.id} has a role that does not fit`;
  }
  return null;
}

function teamIssue(doc: PitchDocument, data: DataSet): string | null {
  for (const side of SIDES) {
    const meta = doc.teams[side];
    if (meta.name.length > TEAM_NAME_MAX_LENGTH) return `${side} team name is too long`;
    if (meta.formationId !== null && !formationOf(data, meta.formationId)) {
      return `${side} formation is unknown`;
    }
    const count = doc.players.filter((player) => player.team === side).length;
    if (count > MAX_PIECES_PER_TEAM) return `${side} team has too many pieces`;
  }
  return null;
}

function scenarioIssue(doc: PitchDocument): string | null {
  if (!insidePitch(doc.ball)) return 'ball is outside the pitch';
  if (doc.attacker === 'opponent' && doc.teams.opponent.formationId === null) {
    return 'opponent attacks without a formation';
  }
  if (!doc.scenario) return null;
  if (!ZONE_IDS.includes(doc.scenario.zone)) return 'scenario zone is unknown';
  if (!Number.isInteger(doc.scenario.sequenceIndex) || doc.scenario.sequenceIndex < 0)
    return 'scenario sequence index is invalid';
  return null;
}

export function documentIssues(doc: PitchDocument, data: DataSet): string | null {
  const ids = new Set(doc.players.map((player) => player.id));
  if (ids.size !== doc.players.length) return 'piece ids are not unique';
  const issue = teamIssue(doc, data) ?? scenarioIssue(doc);
  if (issue) return issue;
  for (const player of doc.players) {
    const found = playerIssue(doc, player, data);
    if (found) return found;
  }
  return null;
}
