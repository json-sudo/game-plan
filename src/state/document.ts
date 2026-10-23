import type { DataSet, Family, Point, Possession, Side, SlotId } from '../data/types';
import type { ZoneId } from '../data/zones';
import { PITCH_H, PITCH_W, clampToPitch as clampPitchPoint, isRoleAllowedInSlot } from '../engine';

export const TEAM_NAME_MAX_LENGTH = 24;
export const PIECE_NAME_MAX_LENGTH = 24;
/** Characters shown on the pitch token; full name stays in bench, tooltip and accessible name. */
export const PIECE_NAME_ON_TOKEN_MAX_LENGTH = 12;
export const SQUAD_SIZES = [11, 20, 26] as const;
export const DEFAULT_TEAM_NAMES: Record<Side, string> = { mine: 'My team', opponent: 'Opponent' };
export const SIDES: readonly Side[] = ['mine', 'opponent'];

export type SquadSize = (typeof SQUAD_SIZES)[number];
export type AppliedLayout = 'formation' | 'matchup' | null;

export interface TeamMeta {
  name: string;
  formationId: string | null;
  squadSize: SquadSize;
  keeper: boolean;
  applied: AppliedLayout;
}

export interface Player {
  id: string;
  team: Side;
  family: Family | null;
  slot: SlotId | null;
  customName?: string;
  isKeeper: boolean;
  role?: string;
  base?: Point;
}

export interface Scenario {
  zone: ZoneId;
  sequenceIndex: number;
}

export interface PitchDocument {
  attacker: Side;
  teams: Record<Side, TeamMeta>;
  players: Player[];
  ball: Point;
  scenario: Scenario | null;
}

export const BALL_START: Point = roundPoint({ x: PITCH_W / 2, y: PITCH_H / 2 });

export function otherSide(side: Side): Side {
  return side === 'mine' ? 'opponent' : 'mine';
}

export function possessionOf(doc: Pick<PitchDocument, 'attacker'>, team: Side): Possession {
  return team === doc.attacker ? 'in' : 'out';
}

export function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

export function roundPoint(point: Point): Point {
  return { x: roundCoordinate(point.x), y: roundCoordinate(point.y) };
}

export function clampToPitch(point: Point): Point {
  return roundPoint(clampPitchPoint(point));
}

export function benchPieceId(team: Side, index: number): string {
  return `${team}-${index}`;
}

function blankPlayers(team: Side, count: number): Player[] {
  return Array.from({ length: count }, (_, index) => ({
    id: benchPieceId(team, index + 1),
    team,
    family: null,
    slot: null,
    isKeeper: false,
  }));
}

function blankTeam(name: string): TeamMeta {
  return { name, formationId: null, squadSize: 11, keeper: false, applied: null };
}

export function createInitialDocument(
  names: Record<Side, string> = DEFAULT_TEAM_NAMES,
): PitchDocument {
  return {
    attacker: 'mine',
    teams: { mine: blankTeam(names.mine), opponent: blankTeam(names.opponent) },
    players: [...blankPlayers('mine', 11), ...blankPlayers('opponent', 11)],
    ball: BALL_START,
    scenario: null,
  };
}

export function playersOf(doc: PitchDocument, team: Side): Player[] {
  return doc.players.filter((player) => player.team === team);
}

// Side comes from the family when it has one (AM(L)), else from the slot id (DCL, DMR).
export function playerSide(player: Pick<Player, 'family' | 'slot'>): 'left' | 'right' | undefined {
  if (player.family?.endsWith('(L)')) return 'left';
  if (player.family?.endsWith('(R)')) return 'right';
  if (player.slot?.endsWith('L')) return 'left';
  if (player.slot?.endsWith('R')) return 'right';
  return undefined;
}

export function keeperOf(doc: PitchDocument, team: Side): Player | undefined {
  return playersOf(doc, team).find((player) => player.isKeeper);
}

export function placedPlayers(doc: PitchDocument): Player[] {
  return doc.players.filter((player) => player.base !== undefined);
}

export function isSetupComplete(doc: PitchDocument): boolean {
  const placed = placedPlayers(doc);
  return (
    doc.teams.mine.formationId !== null &&
    placed.length > 0 &&
    placed.every((player) => player.role !== undefined)
  );
}

export function defaultRoleFor(
  data: DataSet,
  family: Family | null,
  possession: Possession,
): string | undefined {
  if (!family) return undefined;
  return data.roles.find((role) => role.possession === possession && role.families.includes(family))
    ?.id;
}

export function isRoleValidFor(
  doc: PitchDocument,
  data: DataSet,
  player: Player,
  roleId: string,
): boolean {
  const role = data.roles.find((candidate) => candidate.id === roleId);
  const { family } = player;
  if (!role || !family || !role.families.includes(family)) return false;
  if (role.possession !== possessionOf(doc, player.team)) return false;
  const slots = formationOf(data, doc.teams[player.team].formationId)?.slots ?? [];
  return isRoleAllowedInSlot(roleId, player.slot, slots);
}

export function formationOf(data: DataSet, formationId: string | null) {
  return data.formations.find((formation) => formation.id === formationId) ?? null;
}

export function replaceTeamPlayers(doc: PitchDocument, team: Side, next: Player[]): Player[] {
  const kept = (side: Side) => (side === team ? next : playersOf(doc, side));
  return [...kept('mine'), ...kept('opponent')];
}

export function mapPlayer(
  doc: PitchDocument,
  playerId: string,
  update: (player: Player) => Player,
): PitchDocument {
  if (!doc.players.some((player) => player.id === playerId)) return doc;
  return {
    ...doc,
    players: doc.players.map((player) => (player.id === playerId ? update(player) : player)),
  };
}
