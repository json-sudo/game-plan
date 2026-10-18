import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import { FM26_DATA } from '../data/fm26';
import { FAMILIES, type DataSet, type Point, type Side } from '../data/types';
import { PHASES, type Phase } from '../engine';
import {
  MODES,
  SIDES,
  tacticIssues,
  type AppliedLayout,
  type Mode,
  type PitchDocument,
  type Player,
  type Tactic,
  type TacticSnapshot,
  type TeamMeta,
} from '../state';
import { fromBase64Url, toBase64Url } from './base64url';
import {
  sharePayloadSchema,
  type ShareLayoutTuple,
  type SharePayload,
  type SharePlayerTuple,
} from './schema';

export const SHARE_PARAM = 's';
export const SHARE_VERSION = 'v4';
export const SHARE_PREFIX = `${SHARE_PARAM}=${SHARE_VERSION}.`;
export const MAX_SHARE_HASH_LENGTH = 8000;
export const MAX_SHARE_PAYLOAD_BYTES = 65536;

export type ShareErrorCode =
  'not-a-link' | 'old-version' | 'unknown-version' | 'unknown-data' | 'malformed' | 'invalid';

export type DecodeResult =
  | { status: 'ok'; tactic: Tactic; phase: Phase; mode: Mode }
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

const TOO_LARGE_MESSAGE = 'This tactic is too large to share as a link.';

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

function encodeLayout(doc: PitchDocument, data: DataSet): ShareLayoutTuple {
  const pair = <T>(pick: (meta: TeamMeta) => T): [T, T] => [
    pick(doc.teams.mine),
    pick(doc.teams.opponent),
  ];
  return [
    sideCode(doc.attacker),
    pair((meta) => meta.formationId ?? 0),
    pair((meta) => (meta.keeper ? 1 : 0)),
    pair((meta) => APPLIED_CODES.indexOf(meta.applied) as 0 | 1 | 2),
    doc.players.map((player) => encodePlayer(player, data)),
    [fixed(doc.ball.x), fixed(doc.ball.y)],
    doc.scenario ? [doc.scenario.zone, doc.scenario.carrierId] : 0,
  ];
}

function encodePayload(
  { tactic, mode }: TacticSnapshot,
  phase: Phase,
  data: DataSet,
): SharePayload {
  const { openPitch } = tactic;
  return [
    data.version,
    MODES.indexOf(mode) as 0 | 1,
    PHASES.indexOf(phase) as 0 | 1 | 2,
    [openPitch.teams.mine.name, openPitch.teams.opponent.name],
    [openPitch.teams.mine.squadSize, openPitch.teams.opponent.squadSize],
    encodeLayout(tactic.openPitch, data),
    encodeLayout(tactic.fm, data),
  ];
}

export type EncodeResult =
  { status: 'ok'; hash: string } | { status: 'error'; code: 'too-large'; message: string };

export function encodeShareHash(
  snapshot: TacticSnapshot,
  phase: Phase,
  data: DataSet = FM26_DATA,
): EncodeResult {
  const json = JSON.stringify(encodePayload(snapshot, phase, data));
  const hash = `#${SHARE_PREFIX}${toBase64Url(deflateSync(strToU8(json), { level: 9 }))}`;
  if (hash.length - 1 > MAX_SHARE_HASH_LENGTH) {
    return { status: 'error', code: 'too-large', message: TOO_LARGE_MESSAGE };
  }
  return { status: 'ok', hash };
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

function decodeLayout(
  payload: SharePayload,
  layout: ShareLayoutTuple,
  data: DataSet,
): PitchDocument | null {
  const players = layout[4].map((tuple) => decodePlayer(tuple, data));
  if (players.some((player) => player === null)) return null;
  const teamAt = (index: 0 | 1): TeamMeta => ({
    name: payload[3][index],
    formationId: layout[1][index] === 0 ? null : layout[1][index],
    squadSize: payload[4][index],
    keeper: layout[2][index] === 1,
    applied: APPLIED_CODES[layout[3][index]],
  });
  const scenario = layout[6];
  return {
    attacker: SIDES[layout[0]],
    teams: { mine: teamAt(0), opponent: teamAt(1) },
    players: players as Player[],
    ball: { x: layout[5][0] / FIXED_POINT, y: layout[5][1] / FIXED_POINT },
    scenario: scenario === 0 ? null : { zone: scenario[0], carrierId: scenario[1] },
  };
}

function buildTactic(payload: SharePayload, data: DataSet): Tactic | null {
  const openPitch = decodeLayout(payload, payload[5], data);
  const fm = decodeLayout(payload, payload[6], data);
  return openPitch && fm ? { openPitch, fm } : null;
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

const OLD_VERSION_TAGS: readonly string[] = ['v1', 'v2', 'v3'];

function versionFailure(tag: string): DecodeResult {
  return failure(OLD_VERSION_TAGS.includes(tag) ? 'old-version' : 'unknown-version');
}

export function decodeShareHash(hash: string, data: DataSet = FM26_DATA): DecodeResult {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw.startsWith(`${SHARE_PARAM}=`)) return failure('not-a-link');
  if (!raw.startsWith(SHARE_PREFIX)) return versionFailure(raw.slice(2).split('.')[0]);
  if (raw.length > MAX_SHARE_HASH_LENGTH) return failure('malformed');

  const parsed = sharePayloadSchema.safeParse(inflatePayload(raw.slice(SHARE_PREFIX.length)));
  if (!parsed.success) return failure('malformed');
  if (parsed.data[0] !== data.version) return failure('unknown-data');

  const tactic = buildTactic(parsed.data, data);
  if (!tactic || tacticIssues(tactic, data) !== null) return failure('invalid');
  return {
    status: 'ok',
    tactic,
    mode: MODES[parsed.data[1]],
    phase: PHASES[parsed.data[2]],
  };
}
