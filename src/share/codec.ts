import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import { FM26_DATA } from '../data/fm26';
import { FAMILIES, type DataSet, type Point, type Side } from '../data/types';
import { PHASES, type Phase } from '../engine';
import {
  SIDES,
  documentIssues,
  type AppliedLayout,
  type PitchDocument,
  type Mode,
  type Player,
  type TeamMeta,
} from '../state';
import { fromBase64Url, toBase64Url } from './base64url';
import { sharePayloadSchema, type SharePayload, type SharePlayerTuple } from './schema';

export const SHARE_PARAM = 's';
export const SHARE_VERSION = 'v3';
export const SHARE_PREFIX = `${SHARE_PARAM}=${SHARE_VERSION}.`;
export const MAX_SHARE_HASH_LENGTH = 8000;
export const MAX_SHARE_PAYLOAD_BYTES = 65536;

export type ShareErrorCode =
  'not-a-link' | 'old-version' | 'unknown-version' | 'unknown-data' | 'malformed' | 'invalid';

export type DecodeResult =
  | { status: 'ok'; doc: PitchDocument; phase: Phase; mode: Mode }
  | { status: 'error'; code: ShareErrorCode; message: string };

const MESSAGES: Record<ShareErrorCode, string> = {
  'not-a-link': 'This address does not contain a Game Plan link.',
  'old-version':
    'This link is from the old Game Plan. Old links cannot be opened in this version. Ask for a new link.',
  'unknown-version': 'This link was made by a newer version of Game Plan and cannot be opened.',
  'unknown-data': 'This link uses role and formation data this version does not have.',
  malformed: 'This link is damaged and cannot be opened.',
  invalid: 'This share link could not be opened. Your pitch has not changed.',
};

const APPLIED_CODES: readonly AppliedLayout[] = [null, 'formation', 'matchup'];
const FIXED_POINT = 100;

function failure(code: ShareErrorCode): DecodeResult {
  return { status: 'error', code, message: MESSAGES[code] };
}

function fixed(value: number): number {
  return Math.round(value * FIXED_POINT);
}

function sideCode(side: Side): 0 | 1 {
  return side === 'mine' ? 0 : 1;
}

function encodePlayer(player: Player, data: DataSet): SharePlayerTuple {
  const role = data.roles.find((candidate) => candidate.id === player.role);
  return [
    player.id,
    sideCode(player.team),
    player.family ? FAMILIES.indexOf(player.family) + 1 : 0,
    player.slot ?? 0,
    player.base ? fixed(player.base.x) : null,
    player.base ? fixed(player.base.y) : null,
    role ? role.code : 0,
    player.customName ?? 0,
  ];
}

function encodePayload(doc: PitchDocument, phase: Phase, data: DataSet): SharePayload {
  const pair = <T>(pick: (meta: TeamMeta) => T): [T, T] => [
    pick(doc.teams.mine),
    pick(doc.teams.opponent),
  ];
  return [
    data.version,
    sideCode(doc.attacker),
    pair((meta) => meta.name),
    pair((meta) => meta.formationId ?? 0),
    pair((meta) => meta.squadSize),
    pair((meta) => (meta.keeper ? 1 : 0)),
    pair((meta) => APPLIED_CODES.indexOf(meta.applied) as 0 | 1 | 2),
    doc.players.map((player) => encodePlayer(player, data)),
    [fixed(doc.ball.x), fixed(doc.ball.y)],
    doc.scenario ? [doc.scenario.zone, doc.scenario.carrierId] : 0,
    PHASES.indexOf(phase) as 0 | 1 | 2,
  ];
}

export function encodeShareHash(
  doc: PitchDocument,
  phase: Phase,
  data: DataSet = FM26_DATA,
): string {
  const json = JSON.stringify(encodePayload(doc, phase, data));
  return `#${SHARE_PREFIX}${toBase64Url(deflateSync(strToU8(json), { level: 9 }))}`;
}

function pointOf(x: number | null, y: number | null): Point | undefined | null {
  if (x === null && y === null) return undefined;
  if (x === null || y === null) return null;
  return { x: x / FIXED_POINT, y: y / FIXED_POINT };
}

function decodePlayer(tuple: SharePlayerTuple, data: DataSet): Player | null {
  const [id, team, familyIndex, slot, x, y, roleCode, name] = tuple;
  const base = pointOf(x, y);
  if (base === null) return null;
  const role = roleCode === 0 ? undefined : data.roles.find((r) => r.code === roleCode);
  if (roleCode !== 0 && !role) return null;
  const family = familyIndex === 0 ? null : FAMILIES[familyIndex - 1];
  return {
    id,
    team: SIDES[team],
    family,
    slot: slot === 0 ? null : slot,
    isKeeper: family === 'GK',
    ...(name === 0 ? {} : { customName: name }),
    ...(role ? { role: role.id } : {}),
    ...(base ? { base } : {}),
  };
}

function decodeTeams(payload: SharePayload): PitchDocument['teams'] {
  const teamAt = (index: 0 | 1): TeamMeta => ({
    name: payload[2][index],
    formationId: payload[3][index] === 0 ? null : payload[3][index],
    squadSize: payload[4][index],
    keeper: payload[5][index] === 1,
    applied: APPLIED_CODES[payload[6][index]],
  });
  return { mine: teamAt(0), opponent: teamAt(1) };
}

function buildDocument(payload: SharePayload, data: DataSet): PitchDocument | null {
  const players = payload[7].map((tuple) => decodePlayer(tuple, data));
  if (players.some((player) => player === null)) return null;
  const scenario = payload[9];
  return {
    attacker: SIDES[payload[1]],
    teams: decodeTeams(payload),
    players: players as Player[],
    ball: { x: payload[8][0] / FIXED_POINT, y: payload[8][1] / FIXED_POINT },
    scenario: scenario === 0 ? null : { zone: scenario[0], carrierId: scenario[1] },
  };
}

function inflatePayload(text: string): unknown {
  const bytes = fromBase64Url(text);
  if (!bytes) return undefined;
  try {
    const inflated = inflateSync(bytes);
    if (inflated.length > MAX_SHARE_PAYLOAD_BYTES) return undefined;
    return JSON.parse(strFromU8(inflated));
  } catch {
    return undefined;
  }
}

function versionFailure(tag: string): DecodeResult {
  return failure(tag === 'v1' || tag === 'v2' ? 'old-version' : 'unknown-version');
}

export function decodeShareHash(hash: string, data: DataSet = FM26_DATA): DecodeResult {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw.startsWith(`${SHARE_PARAM}=`)) return failure('not-a-link');
  if (!raw.startsWith(SHARE_PREFIX)) return versionFailure(raw.slice(2).split('.')[0]);
  if (raw.length > MAX_SHARE_HASH_LENGTH) return failure('malformed');

  const parsed = sharePayloadSchema.safeParse(inflatePayload(raw.slice(SHARE_PREFIX.length)));
  if (!parsed.success) return failure('malformed');
  if (parsed.data[0] !== data.version) return failure('unknown-data');

  const doc = buildDocument(parsed.data, data);
  if (!doc || documentIssues(doc, data) !== null) return failure('invalid');
  const mode: Mode = doc.players.some((player) => player.role !== undefined) ? 'fm' : 'openPitch';
  return { status: 'ok', doc, phase: PHASES[parsed.data[10]], mode };
}
