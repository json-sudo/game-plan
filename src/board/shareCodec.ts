import { boardReducer, createInitialBoard } from './boardReducer';
import type { BoardState, SquadSize } from './types';

export const SHARE_VERSION = 'v1';
const HASH_PARAM = 's';

type EncodedPiece = [id: string, x: number, y: number, label: string, name?: string];

type PayloadTuple = [
  squadMine: SquadSize,
  squadOpponent: SquadSize,
  keeperMine: 0 | 1,
  keeperOpponent: 0 | 1,
  formationMine: string | 0,
  formationOpponent: string | 0,
  pieces: EncodedPiece[],
];

function toFixedPoint(n: number): number {
  return Math.round(n * 100);
}

function fromFixedPoint(n: number): number {
  return n / 100;
}

function base64UrlEncode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeBoard(board: BoardState): string {
  const pieces: EncodedPiece[] = board.pieces
    .filter((p) => p.position !== undefined)
    .map((p) => {
      const name = (p as { name?: string }).name;
      const tuple: EncodedPiece = [
        p.id,
        toFixedPoint(p.position!.x),
        toFixedPoint(p.position!.y),
        p.label,
      ];
      if (name) tuple.push(name);
      return tuple;
    });

  const tuple: PayloadTuple = [
    board.squad.mine,
    board.squad.opponent,
    board.keeper.mine ? 1 : 0,
    board.keeper.opponent ? 1 : 0,
    board.formation?.mine ?? 0,
    board.formation?.opponent ?? 0,
    pieces,
  ];

  return `${SHARE_VERSION}.${base64UrlEncode(JSON.stringify(tuple))}`;
}

export function buildShareHash(board: BoardState): string {
  return `#${HASH_PARAM}=${encodeBoard(board)}`;
}

export function looksLikeShareHash(hash: string): boolean {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  return raw.startsWith(`${HASH_PARAM}=`);
}

export type DecodeResult = { status: 'ok'; board: BoardState } | { status: 'invalid' };

function isSquadSize(n: unknown): n is SquadSize {
  return n === 11 || n === 20 || n === 26;
}

function isEncodedPiece(data: unknown): data is EncodedPiece {
  if (!Array.isArray(data) || data.length < 4 || data.length > 5) return false;
  const [id, x, y, label, name] = data;
  if (typeof id !== 'string' || typeof x !== 'number' || typeof y !== 'number') return false;
  if (typeof label !== 'string') return false;
  if (name !== undefined && typeof name !== 'string') return false;
  return true;
}

function isPayloadTuple(data: unknown): data is PayloadTuple {
  if (!Array.isArray(data) || data.length !== 7) return false;
  const [
    squadMine,
    squadOpponent,
    keeperMine,
    keeperOpponent,
    formationMine,
    formationOpponent,
    pieces,
  ] = data;
  if (!isSquadSize(squadMine) || !isSquadSize(squadOpponent)) return false;
  if (keeperMine !== 0 && keeperMine !== 1) return false;
  if (keeperOpponent !== 0 && keeperOpponent !== 1) return false;
  if (formationMine !== 0 && typeof formationMine !== 'string') return false;
  if (formationOpponent !== 0 && typeof formationOpponent !== 'string') return false;
  if (!Array.isArray(pieces)) return false;
  return pieces.every(isEncodedPiece);
}

export function decodeShareHash(hash: string): DecodeResult {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw.startsWith(`${HASH_PARAM}=`)) return { status: 'invalid' };
  const value = raw.slice(HASH_PARAM.length + 1);

  const dotIndex = value.indexOf('.');
  if (dotIndex === -1) return { status: 'invalid' };
  const version = value.slice(0, dotIndex);
  const payload = value.slice(dotIndex + 1);
  if (version !== SHARE_VERSION) return { status: 'invalid' };
  if (!payload) return { status: 'invalid' };

  let json: string;
  try {
    json = base64UrlDecode(payload);
  } catch {
    return { status: 'invalid' };
  }

  let tuple: unknown;
  try {
    tuple = JSON.parse(json);
  } catch {
    return { status: 'invalid' };
  }

  if (!isPayloadTuple(tuple)) return { status: 'invalid' };
  const [
    squadMine,
    squadOpponent,
    keeperMine,
    keeperOpponent,
    formationMine,
    formationOpponent,
    pieces,
  ] = tuple;

  let roster = createInitialBoard();
  roster = boardReducer(roster, { type: 'SET_SQUAD', team: 'mine', size: squadMine });
  roster = boardReducer(roster, { type: 'SET_SQUAD', team: 'opponent', size: squadOpponent });
  if (keeperMine) roster = boardReducer(roster, { type: 'SET_KEEPER', team: 'mine', on: true });
  if (keeperOpponent) {
    roster = boardReducer(roster, { type: 'SET_KEEPER', team: 'opponent', on: true });
  }

  const overrides = new Map(
    pieces.map(([id, x, y, label, name]) => [
      id,
      { position: { x: fromFixedPoint(x), y: fromFixedPoint(y) }, label, name },
    ]),
  );

  const finalPieces = roster.pieces.map((p) => {
    const override = overrides.get(p.id);
    if (!override) return p;
    return {
      ...p,
      position: override.position,
      label: override.label,
      ...(override.name ? { name: override.name } : {}),
    };
  });

  const formation: BoardState['formation'] =
    formationMine || formationOpponent
      ? {
          ...(formationMine ? { mine: formationMine } : {}),
          ...(formationOpponent ? { opponent: formationOpponent } : {}),
        }
      : undefined;

  return {
    status: 'ok',
    board: { ...roster, pieces: finalPieces, formation },
  };
}
