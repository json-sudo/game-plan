import type { DataSet, Family, Point, Possession, Side, SlotId } from '../data/types';
import type { ZoneId } from '../data/zones';
import { PITCH_H, PITCH_W, clampToPitch } from '../engine';

export const TEAM_NAME_MAX_LENGTH = 24;
export const PIECE_NAME_MAX_LENGTH = 24;
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
  carrierId: string;
}

export interface BoardDocument {
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

export function possessionOf(doc: Pick<BoardDocument, 'attacker'>, team: Side): Possession {
  return team === doc.attacker ? 'in' : 'out';
}

export function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

export function roundPoint(point: Point): Point {
  return { x: roundCoordinate(point.x), y: roundCoordinate(point.y) };
}

export function clampToBoard(point: Point): Point {
  return roundPoint(clampToPitch(point));
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
): BoardDocument {
  return {
    attacker: 'mine',
    teams: { mine: blankTeam(names.mine), opponent: blankTeam(names.opponent) },
    players: [...blankPlayers('mine', 11), ...blankPlayers('opponent', 11)],
    ball: BALL_START,
    scenario: null,
  };
}

export function playersOf(doc: BoardDocument, team: Side): Player[] {
  return doc.players.filter((player) => player.team === team);
}

export function placedPlayers(doc: BoardDocument): Player[] {
  return doc.players.filter((player) => player.base !== undefined);
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
  data: DataSet,
  roleId: string,
  family: Family | null,
  possession: Possession,
): boolean {
  const role = data.roles.find((candidate) => candidate.id === roleId);
  return Boolean(
    role && family && role.possession === possession && role.families.includes(family),
  );
}

export function formationOf(data: DataSet, formationId: string | null) {
  return data.formations.find((formation) => formation.id === formationId) ?? null;
}

export function replaceTeamPlayers(doc: BoardDocument, team: Side, next: Player[]): Player[] {
  const kept = (side: Side) => (side === team ? next : playersOf(doc, side));
  return [...kept('mine'), ...kept('opponent')];
}

export function mapPlayer(
  doc: BoardDocument,
  playerId: string,
  update: (player: Player) => Player,
): BoardDocument {
  if (!doc.players.some((player) => player.id === playerId)) return doc;
  return {
    ...doc,
    players: doc.players.map((player) => (player.id === playerId ? update(player) : player)),
  };
}
