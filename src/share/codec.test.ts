import { deflateSync, inflateSync, strToU8 } from 'fflate';
import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../data/fm26';
import {
  applyAction,
  createExampleDocument,
  createInitialDocument,
  type Action,
  type PitchDocument,
} from '../state';
import { SHARE_PREFIX, decodeShareHash, encodeShareHash, type DecodeResult } from './codec';

const example = createExampleDocument();

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

function payloadOf(doc: PitchDocument, phase: 'shape' | 'runs' | 'final' = 'shape'): unknown[] {
  const hash = encodeShareHash(doc, phase);
  const encoded = hash.slice(`#${SHARE_PREFIX}`.length);
  const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(inflateSync(bytes)));
}

function crafted(mutate: (payload: unknown[]) => void): DecodeResult {
  const payload = structuredClone(payloadOf(example, 'runs'));
  mutate(payload);
  return decodeShareHash(rawHash(payload));
}

function rejected(code: string) {
  return { status: 'error', code, message: expect.stringMatching(/.{10,}/) };
}

function run(doc: PitchDocument, ...actions: Action[]): PitchDocument {
  return actions.reduce((current, action) => applyAction(current, action), doc);
}

describe('round trip', () => {
  it('rebuilds the example pitch, the phase and FM mode', () => {
    const result = decodeShareHash(encodeShareHash(example, 'runs'));
    expect(result).toEqual({ status: 'ok', doc: example, phase: 'runs', mode: 'fm' });
  });

  it('keeps each phase', () => {
    for (const phase of ['shape', 'runs', 'final'] as const) {
      const result = decodeShareHash(encodeShareHash(example, phase));
      expect(result.status === 'ok' && result.phase).toBe(phase);
    }
  });

  it('accepts the hash with or without the leading #', () => {
    const hash = encodeShareHash(example, 'final');
    expect(hash.startsWith(`#${SHARE_PREFIX}`)).toBe(true);
    expect(decodeShareHash(hash.slice(1))).toEqual(decodeShareHash(hash));
  });

  it('opens a pitch without roles in openPitch mode', () => {
    const openPitch = run(
      createInitialDocument(),
      { type: 'applyFormation', team: 'mine', formationId: '4_3_3_dm_wide' },
      { type: 'movePlayer', playerId: 'mine-ST', point: { x: 12.34, y: 56.78 } },
    );
    const result = decodeShareHash(encodeShareHash(openPitch, 'shape'));
    expect(result).toEqual({ status: 'ok', doc: openPitch, phase: 'shape', mode: 'openPitch' });
  });

  it('keeps team names, piece names, squad sizes, keepers and the attacker', () => {
    const doc = run(
      example,
      { type: 'renameTeam', team: 'mine', name: 'Ünïcödé FC ⚽' },
      { type: 'renameTeam', team: 'opponent', name: 'Rivals "quoted"' },
      { type: 'setPieceName', playerId: 'mine-ST', name: 'Zoë 🙂' },
      { type: 'setSquadSize', team: 'opponent', size: 20 },
      { type: 'setAttacker', attacker: 'opponent' },
    );
    expect(decodeShareHash(encodeShareHash(doc, 'final'))).toEqual({
      status: 'ok',
      doc,
      phase: 'final',
      mode: 'fm',
    });
  });

  it('keeps benched pieces and a pitch with no scenario', () => {
    const doc = run(
      example,
      { type: 'benchPlayer', playerId: 'mine-DM' },
      { type: 'clearScenario' },
    );
    const result = decodeShareHash(encodeShareHash(doc, 'shape'));
    expect(result.status === 'ok' && result.doc).toEqual(doc);
  });

  it('keeps a blank pitch', () => {
    const blank = createInitialDocument();
    const result = decodeShareHash(encodeShareHash(blank, 'shape'));
    expect(result).toEqual({ status: 'ok', doc: blank, phase: 'shape', mode: 'openPitch' });
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

  it('keeps a full FM pitch with every name at 24 characters under 2,000 characters', () => {
    const named = example.players.reduce<PitchDocument>(
      (doc, player, index) =>
        applyAction(doc, {
          type: 'setPieceName',
          playerId: player.id,
          name: pseudoRandomName(index + 1),
        }),
      example,
    );
    const full = run(
      named,
      { type: 'renameTeam', team: 'mine', name: pseudoRandomName(101) },
      { type: 'renameTeam', team: 'opponent', name: pseudoRandomName(102) },
    );
    expect(full.players).toHaveLength(22);
    expect(full.players.every((p) => p.role && p.customName?.length === 24)).toBe(true);
    const hash = encodeShareHash(full, 'final');
    expect(hash.length).toBeLessThan(2000);
    expect(decodeShareHash(hash)).toMatchObject({ status: 'ok', doc: full });
  });

  it('keeps the unnamed example far below the budget', () => {
    expect(encodeShareHash(example, 'final').length).toBeLessThan(1000);
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

  it('rejects other version tags', () => {
    expect(decodeShareHash('#s=v4.AAAA')).toMatchObject(rejected('unknown-version'));
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
    const hash = encodeShareHash(example, 'shape');
    expect(decodeShareHash(hash.slice(0, hash.length - 25))).toMatchObject(rejected('malformed'));
  });

  it('rejects a payload that is not JSON or has the wrong shape', () => {
    const notJson = toBase64Url(deflateSync(strToU8('not json')));
    expect(decodeShareHash(`#${SHARE_PREFIX}${notJson}`)).toMatchObject(rejected('malformed'));
    expect(decodeShareHash(rawHash({ a: 1 }))).toMatchObject(rejected('malformed'));
    expect(decodeShareHash(rawHash([]))).toMatchObject(rejected('malformed'));
    expect(decodeShareHash(rawHash(null))).toMatchObject(rejected('malformed'));
  });

  it('rejects an oversized hash before inflating it', () => {
    expect(decodeShareHash(`#${SHARE_PREFIX}${'A'.repeat(20000)}`)).toMatchObject(
      rejected('malformed'),
    );
  });

  it('rejects an unknown data version', () => {
    expect(crafted((p) => (p[0] = 'fm99-1'))).toMatchObject(rejected('unknown-data'));
  });

  it('rejects ids and codes that the data does not know', () => {
    expect(crafted((p) => ((p[3] as unknown[])[0] = 'no_such_formation'))).toMatchObject(
      rejected('invalid'),
    );
    const players = (p: unknown[]) => p[7] as unknown[][];
    expect(crafted((p) => (players(p)[0][6] = 'zzzz'))).toMatchObject(rejected('invalid'));
    expect(crafted((p) => (players(p)[0][2] = 99))).toMatchObject(rejected('malformed'));
    expect(crafted((p) => (players(p)[0][3] = 'STL'))).toMatchObject(rejected('invalid'));
    expect(crafted((p) => (p[9] = ['Z-Q', 'mine-ST']))).toMatchObject(rejected('malformed'));
    expect(crafted((p) => (p[9] = ['C-F', 'ghost']))).toMatchObject(rejected('invalid'));
  });

  it('rejects a role that does not fit the player', () => {
    const other = FM26_DATA.roles.find((r) => !r.families.includes('GK') && r.possession === 'in')!;
    expect(crafted((p) => ((p[7] as unknown[][])[0][6] = other.code))).toMatchObject(
      rejected('invalid'),
    );
  });

  it('rejects a scenario whose zone does not match the ball', () => {
    expect(crafted((p) => (p[9] = ['L-D', (p[9] as string[])[1]]))).toMatchObject(
      rejected('invalid'),
    );
  });

  it('rejects positions outside the pitch and bad numbers', () => {
    expect(crafted((p) => ((p[7] as unknown[][])[1][4] = 99999))).toMatchObject(
      rejected('invalid'),
    );
    expect(crafted((p) => ((p[7] as unknown[][])[1][4] = 1.5))).toMatchObject(
      rejected('malformed'),
    );
    expect(crafted((p) => ((p[7] as unknown[][])[1][4] = 'x'))).toMatchObject(
      rejected('malformed'),
    );
  });

  it('rejects names that are too long and duplicate pieces', () => {
    expect(crafted((p) => ((p[2] as string[])[0] = 'n'.repeat(25)))).toMatchObject(
      rejected('malformed'),
    );
    expect(crafted((p) => ((p[7] as unknown[][])[0][7] = 'n'.repeat(25)))).toMatchObject(
      rejected('malformed'),
    );
    expect(
      crafted((p) => {
        const list = p[7] as unknown[][];
        list[1][0] = list[0][0];
      }),
    ).toMatchObject(rejected('invalid'));
  });

  it('rejects an unknown phase', () => {
    expect(crafted((p) => (p[10] = 3))).toMatchObject(rejected('malformed'));
  });
});
