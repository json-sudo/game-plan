import { FM26_DATA } from '../data/fm26';
import type { Family, Side } from '../data/types';
import {
  BALL_START,
  DEFAULT_TEAM_NAMES,
  PIECE_NAME_MAX_LENGTH,
  SIDES,
  defaultRoleFor,
  possessionOf,
  clampToBoard,
  type BoardDocument,
  type Player,
  type TeamMeta,
} from '../state';
import { savedSlotV1Schema, type BoardV1, type PieceV1 } from './schema-v1';
import type { SlotEntry } from './schema';

export type Migration = (entry: SlotEntry) => SlotEntry;

export const V1_LABEL_FAMILIES: Readonly<Record<string, Family>> = {
  GK: 'GK',
  LB: 'D(L)',
  CB: 'D(C)',
  RB: 'D(R)',
  LWB: 'WB(L)',
  RWB: 'WB(R)',
  DM: 'DM',
  CM: 'M(C)',
  LM: 'M(L)',
  RM: 'M(R)',
  AM: 'AM(C)',
  LW: 'AM(L)',
  RW: 'AM(R)',
  ST: 'ST',
};

function familyOf(piece: PieceV1): Family | null {
  if (piece.isKeeper) return 'GK';
  return Object.hasOwn(V1_LABEL_FAMILIES, piece.label) ? V1_LABEL_FAMILIES[piece.label] : null;
}

function migratePlayer(piece: PieceV1, attacker: Side): Player {
  const family = familyOf(piece);
  const customName = piece.name?.trim().slice(0, PIECE_NAME_MAX_LENGTH).trim();
  const role = defaultRoleFor(FM26_DATA, family, possessionOf({ attacker }, piece.team));
  return {
    id: piece.id,
    team: piece.team,
    family,
    slot: null,
    isKeeper: Boolean(piece.isKeeper),
    ...(customName ? { customName } : {}),
    ...(role ? { role } : {}),
    ...(piece.position ? { base: clampToBoard(piece.position) } : {}),
  };
}

function migrateTeam(board: BoardV1, team: Side): TeamMeta {
  return {
    name: DEFAULT_TEAM_NAMES[team],
    formationId: null,
    squadSize: board.squad[team],
    keeper: board.keeper[team],
    applied: null,
  };
}

export function migrateV1Board(board: BoardV1): BoardDocument {
  const attacker: Side = 'mine';
  const ball = board.pieces.find((piece) => piece.type === 'ball')?.position;
  const players = SIDES.flatMap((team) =>
    board.pieces
      .filter((piece) => piece.type === 'player' && piece.team === team)
      .map((piece) => migratePlayer(piece, attacker)),
  );
  return {
    attacker,
    teams: { mine: migrateTeam(board, 'mine'), opponent: migrateTeam(board, 'opponent') },
    players,
    ball: ball ? clampToBoard(ball) : BALL_START,
    scenario: null,
  };
}

function migrateV1Entry(entry: SlotEntry): SlotEntry {
  const parsed = savedSlotV1Schema.safeParse(entry.slot);
  if (!parsed.success) return { version: 2, slot: entry.slot };
  return { version: 2, slot: { ...parsed.data, board: migrateV1Board(parsed.data.board) } };
}

export const MIGRATIONS: Record<number, Migration> = { 1: migrateV1Entry };

export function runMigrations(
  entry: SlotEntry,
  migrations: Record<number, Migration>,
  targetVersion: number,
): SlotEntry | null {
  let current = entry;
  while (current.version < targetVersion) {
    const migrate = migrations[current.version];
    if (!migrate) return null;
    current = migrate(current);
  }
  return current.version === targetVersion ? current : null;
}
