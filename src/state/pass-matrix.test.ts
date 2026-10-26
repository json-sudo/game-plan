import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../data/fm26';
import type { FormationDef, Side } from '../data/types';
import { ZONE_IDS, type ZoneId } from '../data/zones';
import { MAX_COVER_TRAVEL, MAX_RECEIVER_TRAVEL, MAX_SUPPORT_TRAVEL } from '../engine/fm/pass-plan';
import { FALLBACK_MAX_PASS_LENGTH, MIN_PASS_LENGTH } from '../engine/fm/pass-validity';
import { BODY_DISTANCE } from '../engine/fm/shape';
import {
  visualizationsFor,
  type Visualization,
  type VisualizationFrame,
  type VisualizationInput,
} from '../engine/fm/visualization';
import { laneOf, thirdOf } from '../engine/fm/zones';
import { applyAction, type Action } from './actions';
import { createInitialDocument, isRoleValidFor } from './document';

const OPPONENT_FORMATION = '4_2_3_1_dm_wide';
const SEEDS = [11, 23, 37];
const SAMPLE_ZONES: readonly ZoneId[] = ['C-D', 'L-D', 'LH-M', 'C-M', 'R-M', 'RH-F', 'C-F'];
const EPSILON = 1e-9;

interface MatrixConfig {
  formation: string;
  opponent: string | null;
  attacker: Side;
  zone: ZoneId;
  seed: number | null;
}

function formationById(id: string): FormationDef {
  const found = FM26_DATA.formations.find((formation) => formation.id === id);
  if (!found) throw new Error(`no formation ${id}`);
  return found;
}

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function setupDocument(formation: string, opponent: string | null) {
  const actions: Action[] = [
    { type: 'applyFormation', team: 'mine', formationId: formation },
    ...(opponent
      ? [{ type: 'applyFormation', team: 'opponent', formationId: opponent } as const]
      : []),
    ...(opponent ? [{ type: 'applyMatchup' } as const] : []),
  ];
  return actions.reduce((doc, action) => applyAction(doc, action), createInitialDocument());
}

function rolesFor(config: MatrixConfig): Record<string, string> {
  const doc = setupDocument(config.formation, config.opponent);
  const random = config.seed === null ? null : seededRandom(config.seed);
  const attacking = config.attacker;
  const entries = doc.players
    .filter((player) => player.slot !== null && player.family !== 'GK')
    .map((player): [string, string] => {
      const possession = player.team === attacking ? 'in' : 'out';
      const options = FM26_DATA.roles
        .filter(
          (role) =>
            role.possession === possession && isRoleValidFor(doc, FM26_DATA, player, role.id),
        )
        .map((role) => role.id);
      const pick = random ? Math.floor(random() * options.length) : 0;
      return [`${player.team}:${player.slot}`, options[pick]];
    });
  return Object.fromEntries(entries);
}

function inputOf(config: MatrixConfig): VisualizationInput {
  const formations: Record<Side, FormationDef | null> = {
    mine: formationById(config.formation),
    opponent: config.opponent ? formationById(config.opponent) : null,
  };
  return { zone: config.zone, attacker: config.attacker, formations, roles: rolesFor(config) };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function overlapsOf(positions: VisualizationFrame['positions']): string[] {
  const ids = Object.keys(positions);
  return ids.flatMap((id) =>
    ids
      .filter(
        (other) => id < other && distance(positions[id], positions[other]) < BODY_DISTANCE - 1e-6,
      )
      .map((other) => `${id}/${other}`),
  );
}

function violationsOf(config: MatrixConfig, visualization: Visualization): string[] {
  const problems: string[] = [];
  const frames: VisualizationFrame[] = [
    visualization.opening,
    ...visualization.passes.map((pass) => pass.frame),
  ];
  const count = visualization.passes.length;
  const expected: [number, number] =
    thirdOf(config.zone) !== 'F' ? [4, 6] : laneOf(config.zone) === 'C' ? [1, 1] : [2, 2];
  if (count < expected[0] || count > expected[1]) problems.push(`pass count ${count}`);
  const inherited = new Set(overlapsOf(frames[0].positions));
  visualization.passes.forEach((pass, index) => {
    const before = frames[index].positions;
    const after = frames[index + 1].positions;
    if (pass.receiverId.endsWith(':GK')) problems.push(`pass ${index + 1} to a keeper`);
    if (pass.receiverId === pass.carrierId) problems.push(`pass ${index + 1} to self`);
    const length = distance(before[pass.carrierId], after[pass.receiverId]);
    if (length < MIN_PASS_LENGTH - EPSILON || length > FALLBACK_MAX_PASS_LENGTH + EPSILON) {
      problems.push(`pass ${index + 1} length ${length.toFixed(1)}`);
    }
    if (distance(before[pass.receiverId], after[pass.receiverId]) > MAX_RECEIVER_TRAVEL + EPSILON) {
      problems.push(`pass ${index + 1} receiver travel`);
    }
    const supportTravel = Object.keys(before)
      .filter((id) => id !== pass.receiverId)
      .map((id) => distance(before[id], after[id]));
    if (Math.max(...supportTravel) > MAX_SUPPORT_TRAVEL + EPSILON) {
      problems.push(`pass ${index + 1} support travel`);
    }
    const defenderPrefix = config.attacker === 'mine' ? 'opponent:' : 'mine:';
    const responders = Object.keys(before).filter(
      (id) =>
        id.startsWith(defenderPrefix) &&
        !id.endsWith(':GK') &&
        distance(before[id], after[id]) > MAX_COVER_TRAVEL + EPSILON,
    );
    if (responders.length > 1)
      problems.push(`pass ${index + 1} responders ${responders.join(' ')}`);
    const crowded = overlapsOf(after).filter((pair) => !inherited.has(pair));
    if (crowded.length > 0) problems.push(`pass ${index + 1} bodies overlap ${crowded.join(' ')}`);
  });
  return problems;
}

function failureMessage(config: MatrixConfig, problems: readonly string[]): string {
  return `config ${JSON.stringify(config)}: ${problems.join(', ')}`;
}

type Build = typeof visualizationsFor;

function failuresWith(config: MatrixConfig, build: Build): string[] {
  const first = build(inputOf(config));
  const repeated = build(inputOf(config));
  const reproducible = JSON.stringify(first) === JSON.stringify(repeated);
  const problems = first.flatMap((visualization) => violationsOf(config, visualization));
  const all = reproducible ? problems : ['not reproducible', ...problems];
  return all.length > 0 ? [failureMessage(config, all)] : [];
}

function failuresOf(config: MatrixConfig): string[] {
  return failuresWith(config, visualizationsFor);
}

function configsFor(formation: string, zones: readonly ZoneId[]): MatrixConfig[] {
  const base = { formation, opponent: OPPONENT_FORMATION, attacker: 'mine', seed: null } as const;
  return zones.map((zone) => ({ ...base, zone }));
}

describe('pass planning matrix', () => {
  for (const formation of FM26_DATA.formations) {
    it(`plans valid sequences for ${formation.id} in every zone`, () => {
      expect(configsFor(formation.id, ZONE_IDS).flatMap(failuresOf)).toEqual([]);
    });

    it(`plans valid sequences for ${formation.id} without opposition and as the opponent attack`, () => {
      const configs = configsFor(formation.id, SAMPLE_ZONES).flatMap((config) => [
        { ...config, opponent: null },
        { ...config, attacker: 'opponent' as const },
      ]);
      expect(configs.flatMap(failuresOf)).toEqual([]);
    });

    it(`plans valid sequences for ${formation.id} with seeded mixed roles`, () => {
      const configs = SEEDS.flatMap((seed) =>
        configsFor(formation.id, SAMPLE_ZONES).map((config) => ({ ...config, seed })),
      );
      expect(configs.flatMap(failuresOf)).toEqual([]);
    });
  }

  it('prints the full reproducible config and seed on a real failure', () => {
    const config: MatrixConfig = {
      formation: '4_3_3_dm_wide',
      opponent: null,
      attacker: 'mine',
      zone: 'C-M',
      seed: 11,
    };
    const truncated: Build = (input) =>
      visualizationsFor(input).map((visualization) => ({
        ...visualization,
        passes: visualization.passes.slice(0, 1),
      }));
    const [message] = failuresWith(config, truncated);
    expect(message).toContain(JSON.stringify(config));
    expect(message).toContain('"seed":11');
    expect(message).toContain('pass count 1');
  });

  const SHAPES = [
    ['narrow', '4_4_2_diamond_narrow'],
    ['no full-back', '3_2_4_1'],
    ['paired forwards', '4_2_2_2_dm_wide'],
  ] as const;

  for (const [label, formation] of SHAPES) {
    it(`gives exact pass counts per third reproducibly for a ${label} formation`, () => {
      for (const zone of ZONE_IDS) {
        const input = inputOf({
          formation,
          opponent: OPPONENT_FORMATION,
          attacker: 'mine',
          zone,
          seed: null,
        });
        const counts = visualizationsFor(input).map((visualization) => visualization.passes.length);
        const exact = thirdOf(zone) === 'F' ? (laneOf(zone) === 'C' ? 1 : 2) : null;
        expect(
          counts.filter((count) => (exact ?? count) !== count || count > 6 || count < 1),
        ).toEqual([]);
        expect(counts.filter((count) => exact === null && count < 4)).toEqual([]);
        expect(visualizationsFor(input)).toEqual(visualizationsFor(input));
      }
    });
  }
});
