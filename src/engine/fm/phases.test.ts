import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../../data/fm26';
import type { FormationDef, RoleDef, Side } from '../../data/types';
import { ZONE_IDS } from '../../data/zones';
import { PITCH_W } from '../geometry/pitch';
import { layoutFormation } from '../layout/formations';
import { minSpacingOf, MIN_TOKEN_SPACING } from '../layout/spacing';
import { PITCH_TARGET_MARGIN, offsetFor } from './movement';
import {
  PHASES,
  PHASE_PROGRESS,
  computePhases,
  type PhaseInput,
  type PhasePlayer,
} from './phases';
import { zoneCentre } from './zones';

const tables = {
  movement: FM26_DATA.movement,
  shapeLineShift: FM26_DATA.shapeLineShift,
  lineShift: FM26_DATA.lineShift,
};

function firstRole(family: string, possession: 'in' | 'out'): RoleDef {
  const role = FM26_DATA.roles.find(
    (candidate) =>
      candidate.possession === possession && candidate.families.some((item) => item === family),
  );
  if (!role) throw new Error(`no ${possession} role for ${family}`);
  return role;
}

function squad(formation: FormationDef, team: Side, possession: 'in' | 'out'): PhasePlayer[] {
  const layout = layoutFormation(formation, team);
  return formation.slots.map((slot) => ({
    id: `${team}:${slot.id}`,
    team,
    base: layout.get(slot.id)!,
    roleId: firstRole(slot.family, possession).id,
    isKeeper: slot.family === 'GK',
  }));
}

function pitch(attacker: Side, formationIndex = 0): PhasePlayer[] {
  const formation = FM26_DATA.formations[formationIndex];
  const defender: Side = attacker === 'mine' ? 'opponent' : 'mine';
  return [...squad(formation, attacker, 'in'), ...squad(formation, defender, 'out')];
}

function input(attacker: Side, zone: (typeof ZONE_IDS)[number], index = 0): PhaseInput {
  const players = pitch(attacker, index);
  const ball = zoneCentre(zone, attacker);
  return { attacker, players, ball, carrierId: `${attacker}:ST`, tables };
}

describe('PHASE_PROGRESS', () => {
  it('runs shape 0, runs 0.5, final 1', () => {
    expect(PHASES).toEqual(['shape', 'runs', 'final']);
    expect(PHASE_PROGRESS).toEqual({ shape: 0, runs: 0.5, final: 1 });
  });
});

describe('computePhases', () => {
  const scenario = input('mine', 'R-F');
  const phases = computePhases(scenario);
  const targets = phases.positions.final;

  it('puts every player in every phase', () => {
    for (const phase of PHASES) expect(phases.positions[phase].size).toBe(scenario.players.length);
  });

  it('moves the attacking block for the selected zone and places the carrier on the ball', () => {
    const movedAttackers = scenario.players.filter(
      (player) =>
        player.team === 'mine' && !player.isKeeper && player.id !== scenario.carrierId,
    );
    expect(movedAttackers.length).toBeGreaterThan(0);
    for (const player of movedAttackers) {
      expect(phases.positions.shape.get(player.id)).not.toEqual(player.base);
    }
    expect(phases.positions.shape.get(scenario.carrierId!)).toEqual(scenario.ball);
  });

  it('puts the final phase on the targets and the runs phase halfway', () => {
    for (const player of scenario.players) {
      if (player.id === scenario.carrierId) continue;
      const target = targets.get(player.id)!;
      expect(phases.positions.final.get(player.id)).toEqual(target);
      const runs = phases.positions.runs.get(player.id)!;
      expect(runs.x).toBeGreaterThanOrEqual(PITCH_TARGET_MARGIN);
      expect(runs.y).toBeGreaterThanOrEqual(PITCH_TARGET_MARGIN);
      expect(target.x).toBeGreaterThanOrEqual(PITCH_TARGET_MARGIN);
    }
  });

  it('keeps the carrier on the ball in every phase', () => {
    for (const phase of PHASES)
      expect(phases.positions[phase].get(scenario.carrierId!)).toEqual(scenario.ball);
  });

  it('moves at least one attacker and one defender', () => {
    const moved = (team: Side) =>
      scenario.players.some(
        (player) =>
          player.team === team &&
          player.id !== scenario.carrierId &&
          JSON.stringify(targets.get(player.id)) !== JSON.stringify(player.base),
      );
    expect(moved('mine')).toBe(true);
    expect(moved('opponent')).toBe(true);
  });

  it('is deterministic', () => {
    expect(computePhases(scenario)).toEqual(computePhases(structuredClone(scenario)));
  });

  it('keeps spacing in Shape, Runs and Final', () => {
    for (const phase of PHASES) {
      expect(minSpacingOf(phases.positions[phase].values())).toBeGreaterThanOrEqual(
        MIN_TOKEN_SPACING,
      );
    }
  });

  it('does not mutate its input', () => {
    const copy = structuredClone(scenario);
    computePhases(scenario);
    expect(scenario).toEqual(copy);
  });

  it('lets nobody carry when there is no carrier', () => {
    const none = computePhases({ ...scenario, carrierId: null });
    expect(none.positions.final.size).toBe(scenario.players.length);
  });

  it('keeps attackers without a role on their zone shape', () => {
    const roleless = {
      ...scenario,
      players: scenario.players.map((p) => ({ ...p, roleId: undefined })),
    };
    const result = computePhases(roleless);
    const attackers = scenario.players.filter(
      (p) => p.team === 'mine' && p.id !== scenario.carrierId,
    );
    for (const attacker of attackers) {
      const shape = result.positions.shape.get(attacker.id)!;
      const final = result.positions.final.get(attacker.id)!;
      expect(Math.hypot(shape.x - final.x, shape.y - final.y)).toBeLessThan(MIN_TOKEN_SPACING);
    }
  });

  it('shifts every outfield defender by the line shift and adds role offsets only where set', () => {
    const central = input('mine', 'C-F');
    const players = central.players.map((p) =>
      p.team === 'opponent' && p.id !== 'opponent:DCL' ? { ...p, roleId: undefined } : p,
    );
    const result = computePhases({ ...central, players });
    const targets = result.positions.final;
    const shift = FM26_DATA.lineShift['C-F'].dy;
    const others = players.filter((p) => p.team === 'opponent' && p.id !== 'opponent:DCL');
    for (const keeper of others.filter((p) => p.isKeeper)) {
      expect(targets.get(keeper.id)).toEqual(keeper.base);
    }
    for (const player of others.filter((p) => !p.isKeeper)) {
      const shape = result.positions.shape.get(player.id)!;
      const target = targets.get(player.id)!;
      const expected = { x: shape.x, y: shape.y + shift };
      expect(Math.hypot(target.x - expected.x, target.y - expected.y)).toBeLessThan(
        MIN_TOKEN_SPACING,
      );
    }
    const dcl = players.find((p) => p.id === 'opponent:DCL')!;
    const [, wide, depth] = offsetFor(FM26_DATA.movement, dcl.roleId!, 'C-F', 'ball')!;
    const dclShape = result.positions.shape.get(dcl.id)!;
    const expectedDcl = {
      x: dclShape.x + wide * Math.sign(dcl.base.x - PITCH_W / 2),
      y: dclShape.y + shift + depth,
    };
    const target = targets.get(dcl.id)!;
    expect(Math.hypot(target.x - expectedDcl.x, target.y - expectedDcl.y)).toBeLessThan(
      MIN_TOKEN_SPACING,
    );
  });

  it('keeps every target inside the pitch margin for every formation, zone and attacker', () => {
    const outside: string[] = [];
    for (const attacker of ['mine', 'opponent'] as const) {
      for (let index = 0; index < FM26_DATA.formations.length; index += 1) {
        for (const zone of ZONE_IDS) {
          for (const [id, point] of computePhases(input(attacker, zone, index)).positions.final) {
            const inside =
              point.x >= PITCH_TARGET_MARGIN - 1e-9 &&
              point.x <= PITCH_W - PITCH_TARGET_MARGIN + 1e-9 &&
              point.y >= PITCH_TARGET_MARGIN - 1e-9 &&
              point.y <= 100 - PITCH_TARGET_MARGIN + 1e-9;
            if (!inside) outside.push(`${attacker} ${index} ${zone} ${id}`);
          }
        }
      }
    }
    expect(outside).toEqual([]);
  });
});

describe('mirrored attackers', () => {
  it('gives the opponent the 180 degree mirror of my team for the same shapes', () => {
    const mine = computePhases(input('mine', 'R-F')).positions.shape;
    const opponent = computePhases(input('opponent', 'R-F')).positions.shape;
    const mirrorTolerance = MIN_TOKEN_SPACING;
    for (const [id, point] of mine) {
      const swapped = id.startsWith('mine:')
        ? id.replace('mine:', 'opponent:')
        : id.replace('opponent:', 'mine:');
      const other = opponent.get(swapped)!;
      expect(Math.abs(other.x - (PITCH_W - point.x))).toBeLessThan(mirrorTolerance);
      expect(Math.abs(other.y - (100 - point.y))).toBeLessThan(mirrorTolerance);
    }
  });
});
