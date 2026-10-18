import { deflateSync, inflateSync, strToU8 } from 'fflate';
import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../data/fm26';
import {
  applyTacticAction,
  copyFmPositions,
  createExampleTactic,
  createInitialTactic,
  type Action,
  type Mode,
  type Tactic,
  type TacticSnapshot,
} from '../state';
import {
  MAX_SHARE_HASH_LENGTH,
  SHARE_PREFIX,
  decodeShareHash,
  encodeShareHash,
  type DecodeResult,
} from './codec';

function exampleSlotId(team: string, slot: string): string {
  const found = createExampleTactic().fm.players.find((p) => p.team === team && p.slot === slot);
  if (!found) throw new Error(`no example ${team} player at ${slot}`);
  return found.id;
}

const MINE_DM = exampleSlotId('mine', 'DM');
const MINE_ST = exampleSlotId('mine', 'ST');
const OPPONENT_DML = exampleSlotId('opponent', 'DML');

const example = createExampleTactic();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function rawHash(payload: unknown): string {
  return `#${SHARE_PREFIX}${toBase64Url(deflateSync(strToU8(JSON.stringify(payload))))}`;
}

function snapshot(tactic: Tactic, mode: Mode): TacticSnapshot {
  return { tactic, mode };
}

function hashOf(
  tactic: Tactic,
  mode: Mode = 'fm',
  phase: 'shape' | 'runs' | 'final' = 'shape',
): string {
  const result = encodeShareHash(snapshot(tactic, mode), phase);
  if (result.status !== 'ok') throw new Error('expected the tactic to fit in a link');
  return result.hash;
}

function payloadOf(tactic: Tactic, mode: Mode, phase: 'shape' | 'runs' | 'final'): unknown[] {
  const encoded = hashOf(tactic, mode, phase).slice(`#${SHARE_PREFIX}`.length);
  const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(inflateSync(bytes)));
}

const FM_LAYOUT = 6;
const OPEN_LAYOUT = 5;
const PLAYERS = 4;
const SCENARIO = 6;

function crafted(mutate: (payload: unknown[]) => void): DecodeResult {
  const payload = structuredClone(payloadOf(example, 'fm', 'runs'));
  mutate(payload);
  return decodeShareHash(rawHash(payload));
}

function fmLayout(payload: unknown[]): unknown[] {
  return payload[FM_LAYOUT] as unknown[];
}

function fmPlayers(payload: unknown[]): unknown[][] {
  return fmLayout(payload)[PLAYERS] as unknown[][];
}

function rejected(code: string) {
  return { status: 'error', code, message: expect.stringMatching(/.{10,}/) };
}

function run(tactic: Tactic, mode: Mode, ...actions: Action[]): Tactic {
  return actions.reduce((current, action) => applyTacticAction(current, mode, action), tactic);
}

function arranged(): Tactic {
  const base = run(
    createExampleTactic(),
    'openPitch',
    { type: 'applyFormation', team: 'mine', formationId: '4_4_2' },
    { type: 'movePlayer', playerId: MINE_ST, point: { x: 12.34, y: 56.78 } },
    { type: 'dragBall', point: { x: 70.5, y: 33.25 } },
  );
  return run(
    base,
    'fm',
    { type: 'tapZone', zone: 'L-D' },
    { type: 'setPieceName', playerId: MINE_ST, name: 'Zoë 🙂' },
  );
}

describe('round trip', () => {
  it('rebuilds the example tactic, the phase and the share-time mode', () => {
    const result = decodeShareHash(hashOf(example, 'fm', 'runs'));
    expect(result).toEqual({ status: 'ok', tactic: example, phase: 'runs', mode: 'fm' });
  });

  it('keeps each phase', () => {
    for (const phase of ['shape', 'runs', 'final'] as const) {
      const result = decodeShareHash(hashOf(example, 'fm', phase));
      expect(result.status === 'ok' && result.phase).toBe(phase);
    }
  });

  it('accepts the hash with or without the leading #', () => {
    const hash = hashOf(example, 'fm', 'final');
    expect(hash.startsWith(`#${SHARE_PREFIX}`)).toBe(true);
    expect(decodeShareHash(hash.slice(1))).toEqual(decodeShareHash(hash));
  });

  it('keeps both layouts, the open pitch ball and the FM scenario', () => {
    const tactic = arranged();
    const result = decodeShareHash(hashOf(tactic, 'openPitch'));
    expect(result).toEqual({ status: 'ok', tactic, phase: 'shape', mode: 'openPitch' });
    expect(tactic.openPitch.ball).toEqual({ x: 70.5, y: 33.25 });
    expect(tactic.fm.scenario?.zone).toBe('L-D');
  });

  it('restores the mode that was active when the link was made, whatever the roles', () => {
    for (const mode of ['openPitch', 'fm'] as const) {
      for (const tactic of [example, arranged(), createInitialTactic()]) {
        const result = decodeShareHash(hashOf(tactic, mode));
        expect(result.status === 'ok' && result.mode).toBe(mode);
      }
    }
  });

  it('keeps team names, piece names, squad sizes, keepers and the FM attacker', () => {
    const tactic = run(
      example,
      'fm',
      { type: 'renameTeam', team: 'mine', name: 'Ünïcödé FC ⚽' },
      { type: 'renameTeam', team: 'opponent', name: 'Rivals "quoted"' },
      { type: 'setPieceName', playerId: MINE_ST, name: 'Zoë 🙂' },
      { type: 'setSquadSize', team: 'opponent', size: 20 },
      { type: 'setAttacker', attacker: 'opponent' },
    );
    expect(decodeShareHash(hashOf(tactic, 'fm', 'final'))).toEqual({
      status: 'ok',
      tactic,
      phase: 'final',
      mode: 'fm',
    });
  });

  it('keeps benched pieces and a pitch with no scenario', () => {
    const tactic = run(
      copyFmPositions(example),
      'openPitch',
      { type: 'benchPlayer', playerId: MINE_DM },
      { type: 'benchPlayer', playerId: OPPONENT_DML },
    );
    const cleared = run(tactic, 'fm', { type: 'clearScenario' });
    const result = decodeShareHash(hashOf(cleared, 'openPitch'));
    expect(result.status === 'ok' && result.tactic).toEqual(cleared);
  });

  it('keeps a blank tactic', () => {
    const blank = createInitialTactic();
    const result = decodeShareHash(hashOf(blank, 'openPitch'));
    expect(result).toEqual({ status: 'ok', tactic: blank, phase: 'shape', mode: 'openPitch' });
  });
});

describe('size budget', () => {
  function pseudoRandomName(seed: number): string {
    const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let state = seed * 9301 + 49297;
    return Array.from({ length: 24 }, () => {
      state = (state * 9301 + 49297) % 233280;
      return alphabet[state % alphabet.length];
    }).join('');
  }

  function fullTactic(): Tactic {
    const named = example.fm.players.reduce(
      (tactic, player, index) =>
        applyTacticAction(tactic, 'fm', {
          type: 'setPieceName',
          playerId: player.id,
          name: pseudoRandomName(index + 1),
        }),
      example,
    );
    return run(
      copyFmPositions(named),
      'fm',
      { type: 'renameTeam', team: 'mine', name: pseudoRandomName(101) },
      { type: 'renameTeam', team: 'opponent', name: pseudoRandomName(102) },
    );
  }

  it('keeps two full 22-piece layouts with every name at 24 characters under the hash limit', () => {
    const full = fullTactic();
    expect(full.fm.players).toHaveLength(22);
    expect(full.openPitch.players.every((p) => p.customName?.length === 24)).toBe(true);
    const hash = hashOf(full, 'fm', 'final');
    expect(hash.length).toBeLessThan(MAX_SHARE_HASH_LENGTH / 2);
    expect(decodeShareHash(hash)).toMatchObject({ status: 'ok', tactic: full });
  });

  it('keeps the unnamed example far below the budget', () => {
    expect(hashOf(example, 'fm', 'final').length).toBeLessThan(1500);
  });

  it('fits the largest tactic: 26-player squads, both layouts placed and named', () => {
    const squads = run(
      fullTactic(),
      'fm',
      { type: 'setSquadSize', team: 'mine', size: 26 },
      { type: 'setSquadSize', team: 'opponent', size: 26 },
    );
    const result = encodeShareHash(snapshot(squads, 'fm'), 'final');
    expect(result.status).toBe('ok');
    expect(result.status === 'ok' && result.hash.length).toBeLessThan(MAX_SHARE_HASH_LENGTH);
  });

  it('refuses to make a link that is longer than the decoder accepts', () => {
    const noise = (layout: Tactic['fm'], seed: number): Tactic['fm'] => ({
      ...layout,
      players: Array.from({ length: 54 }, (_, index) => ({
        ...layout.players[0],
        id: [1, 2, 3]
          .map((part) => pseudoRandomName(seed + index * 3 + part))
          .join('')
          .slice(0, 64),
        customName: pseudoRandomName(seed + index + 7000),
      })),
    });
    const result = encodeShareHash(
      snapshot({ openPitch: noise(example.openPitch, 0), fm: noise(example.fm, 9000) }, 'fm'),
      'shape',
    );
    expect(result).toMatchObject({ status: 'error', code: 'too-large' });
  });
});

describe('rejected links', () => {
  it('rejects a v1 link with a clear message', () => {
    expect(decodeShareHash('#s=v1.AAAA')).toEqual({
      status: 'error',
      code: 'old-version',
      message:
        'This link is from the old Game Plan. Old links cannot be opened in this version. Ask for a new link.',
    });
  });

  it('rejects every earlier version, v3 included, as an old link', () => {
    for (const tag of ['v1', 'v2', 'v3']) {
      expect(decodeShareHash(`#s=${tag}.AAAA`)).toMatchObject(rejected('old-version'));
    }
  });

  it('rejects a v3 payload without decoding it', () => {
    const v3 = `#s=v3.${toBase64Url(deflateSync(strToU8(JSON.stringify(['fm26', 0]))))}`;
    expect(decodeShareHash(v3)).toMatchObject(rejected('old-version'));
  });

  it('rejects newer or missing version tags', () => {
    expect(decodeShareHash('#s=v5.AAAA')).toMatchObject(rejected('unknown-version'));
    expect(decodeShareHash('#s=AAAA')).toMatchObject(rejected('unknown-version'));
  });

  it('rejects hashes that are not share links', () => {
    expect(decodeShareHash('')).toMatchObject(rejected('not-a-link'));
    expect(decodeShareHash('#other=1')).toMatchObject(rejected('not-a-link'));
  });

  it('rejects damaged payloads', () => {
    expect(decodeShareHash(`#${SHARE_PREFIX}`)).toMatchObject(rejected('malformed'));
    expect(decodeShareHash(`#${SHARE_PREFIX}not base64!!`)).toMatchObject(rejected('malformed'));
    expect(decodeShareHash(`#${SHARE_PREFIX}A`)).toMatchObject(rejected('malformed'));
    expect(decodeShareHash(`#${SHARE_PREFIX}AAAAAAAA`)).toMatchObject(rejected('malformed'));
    const hash = hashOf(example, 'fm');
    expect(decodeShareHash(hash.slice(0, hash.length - 25))).toMatchObject(rejected('malformed'));
  });

  it('rejects a payload that is not JSON or has the wrong shape', () => {
    const notJson = toBase64Url(deflateSync(strToU8('not json')));
    expect(decodeShareHash(`#${SHARE_PREFIX}${notJson}`)).toMatchObject(rejected('malformed'));
    expect(decodeShareHash(rawHash({ a: 1 }))).toMatchObject(rejected('malformed'));
    expect(decodeShareHash(rawHash([]))).toMatchObject(rejected('malformed'));
    expect(decodeShareHash(rawHash(null))).toMatchObject(rejected('malformed'));
  });

  it('rejects a payload with only one layout', () => {
    expect(crafted((p) => p.splice(OPEN_LAYOUT, 1))).toMatchObject(rejected('malformed'));
    expect(crafted((p) => p.pop())).toMatchObject(rejected('malformed'));
  });

  it('rejects a payload without an explicit mode, or with an unknown one', () => {
    expect(crafted((p) => (p[1] = 2))).toMatchObject(rejected('malformed'));
    expect(crafted((p) => (p[1] = null))).toMatchObject(rejected('malformed'));
    expect(crafted((p) => (p[1] = 'fm'))).toMatchObject(rejected('malformed'));
  });

  it('rejects an oversized hash before inflating it', () => {
    expect(
      decodeShareHash(`#${SHARE_PREFIX}${'A'.repeat(MAX_SHARE_HASH_LENGTH + 1)}`),
    ).toMatchObject(rejected('malformed'));
  });

  it('rejects an unknown data version', () => {
    expect(crafted((p) => (p[0] = 'fm99-1'))).toMatchObject(rejected('unknown-data'));
  });

  it('rejects ids and codes that the data does not know', () => {
    expect(crafted((p) => ((fmLayout(p)[1] as unknown[])[0] = 'no_such_formation'))).toMatchObject(
      rejected('invalid'),
    );
    expect(crafted((p) => (fmPlayers(p)[0][6] = 'zzzz'))).toMatchObject(rejected('invalid'));
    expect(crafted((p) => (fmPlayers(p)[0][2] = 99))).toMatchObject(rejected('malformed'));
    expect(crafted((p) => (fmPlayers(p)[0][3] = 'STL'))).toMatchObject(rejected('invalid'));
    expect(crafted((p) => (fmLayout(p)[SCENARIO] = ['Z-Q', MINE_ST]))).toMatchObject(
      rejected('malformed'),
    );
    expect(crafted((p) => (fmLayout(p)[SCENARIO] = ['C-F', 'ghost']))).toMatchObject(
      rejected('invalid'),
    );
  });

  it('rejects a role that does not fit the player', () => {
    const other = FM26_DATA.roles.find((r) => !r.families.includes('GK') && r.possession === 'in')!;
    expect(crafted((p) => (fmPlayers(p)[0][6] = other.code))).toMatchObject(rejected('invalid'));
  });

  it('rejects roles or a scenario in the open pitch layout', () => {
    const role = fmPlayers(structuredClone(payloadOf(example, 'fm', 'shape')))[0][6];
    expect(
      crafted((p) => {
        const open = p[OPEN_LAYOUT] as unknown[];
        open[PLAYERS] = fmPlayers(p).map((tuple) => [...tuple]);
        (open[PLAYERS] as unknown[][])[0][6] = role;
        open[1] = fmLayout(p)[1];
      }),
    ).toMatchObject(rejected('invalid'));
    expect(
      crafted((p) => ((p[OPEN_LAYOUT] as unknown[])[SCENARIO] = fmLayout(p)[SCENARIO])),
    ).toMatchObject(rejected('invalid'));
  });

  it('rejects a scenario whose zone does not match the ball', () => {
    expect(
      crafted((p) => (fmLayout(p)[SCENARIO] = ['L-D', (fmLayout(p)[SCENARIO] as string[])[1]])),
    ).toMatchObject(rejected('invalid'));
  });

  it('rejects the same piece carrying different names in the two layouts', () => {
    expect(
      crafted((p) => {
        const open = p[OPEN_LAYOUT] as unknown[];
        const copy = fmPlayers(p).map((tuple) => [...tuple]);
        copy[0][7] = 'Alpha';
        open[PLAYERS] = copy;
        open[1] = fmLayout(p)[1];
      }),
    ).toMatchObject(rejected('invalid'));
  });

  it('rejects positions outside the pitch and bad numbers', () => {
    expect(crafted((p) => (fmPlayers(p)[1][4] = 99999))).toMatchObject(rejected('invalid'));
    expect(crafted((p) => (fmPlayers(p)[1][4] = 1.5))).toMatchObject(rejected('malformed'));
    expect(crafted((p) => (fmPlayers(p)[1][4] = 'x'))).toMatchObject(rejected('malformed'));
  });

  it('rejects names that are too long and duplicate pieces', () => {
    expect(crafted((p) => ((p[3] as string[])[0] = 'n'.repeat(25)))).toMatchObject(
      rejected('malformed'),
    );
    expect(crafted((p) => (fmPlayers(p)[0][7] = 'n'.repeat(25)))).toMatchObject(
      rejected('malformed'),
    );
    expect(
      crafted((p) => {
        const list = fmPlayers(p);
        list[1][0] = list[0][0];
      }),
    ).toMatchObject(rejected('invalid'));
  });

  it('rejects a squad that does not match its declared size', () => {
    expect(crafted((p) => ((p[4] as number[])[0] = 20))).toMatchObject(rejected('invalid'));
  });

  it('rejects an unknown phase', () => {
    expect(crafted((p) => (p[2] = 3))).toMatchObject(rejected('malformed'));
  });
});
