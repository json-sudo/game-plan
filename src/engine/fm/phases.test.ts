import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../../data/fm26';
import type { FormationDef, RoleDef, Side } from '../../data/types';
import { ZONE_IDS } from '../../data/zones';
import { PITCH_W } from '../geometry/pitch';
import { layoutFormation } from '../layout/formations';
import { PITCH_TARGET_MARGIN, offsetFor } from './movement';
import {
  PHASES,
  PHASE_PROGRESS,
  computePhases,
  computeTargets,
  type PhaseInput,
  type PhasePlayer,
} from './phases';
import { zoneCentre } from './zones';

const tables = { movement: FM26_DATA.movement, lineShift: FM26_DATA.lineShift };

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

function board(attacker: Side, formationIndex = 0): PhasePlayer[] {
  const formation = FM26_DATA.formations[formationIndex];
  const defender: Side = attacker === 'mine' ? 'opponent' : 'mine';
  return [...squad(formation, attacker, 'in'), ...squad(formation, defender, 'out')];
}

function input(attacker: Side, zone: (typeof ZONE_IDS)[number], index = 0): PhaseInput {
  const players = board(attacker, index);
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
  const targets = computeTargets(scenario);

  it('puts every player in every phase', () => {
    for (const phase of PHASES) expect(phases[phase].size).toBe(scenario.players.length);
  });

  it('shows the base shape in the shape phase, except the carrier', () => {
    for (const player of scenario.players) {
      if (player.id === scenario.carrierId) continue;
      expect(phases.shape.get(player.id)).toEqual(player.base);
    }
  });

  it('puts the final phase on the targets and the runs phase halfway', () => {
    for (const player of scenario.players) {
      if (player.id === scenario.carrierId) continue;
      const target = targets.get(player.id)!;
      expect(phases.final.get(player.id)).toEqual(target);
      const runs = phases.runs.get(player.id)!;
      expect(runs.x).toBeCloseTo((player.base.x + target.x) / 2);
      expect(runs.y).toBeCloseTo((player.base.y + target.y) / 2);
    }
  });

  it('keeps the carrier on the ball in every phase', () => {
    for (const phase of PHASES)
      expect(phases[phase].get(scenario.carrierId!)).toEqual(scenario.ball);
    expect(targets.get(scenario.carrierId!)).toEqual(scenario.ball);
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

  it('does not mutate its input', () => {
    const copy = structuredClone(scenario);
    computePhases(scenario);
    expect(scenario).toEqual(copy);
  });

  it('lets nobody carry when there is no carrier', () => {
    const none = computePhases({ ...scenario, carrierId: null });
    expect(none.final.size).toBe(scenario.players.length);
  });

  it('keeps attackers without a role on their base position', () => {
    const roleless = {
      ...scenario,
      players: scenario.players.map((p) => ({ ...p, roleId: undefined })),
    };
    const result = computePhases(roleless);
    const attackers = scenario.players.filter(
      (p) => p.team === 'mine' && p.id !== scenario.carrierId,
    );
    for (const attacker of attackers) expect(result.final.get(attacker.id)).toEqual(attacker.base);
  });

  it('shifts every outfield defender by the line shift and adds role offsets only where set', () => {
    const central = input('mine', 'C-F');
    const players = central.players.map((p) =>
      p.team === 'opponent' && p.id !== 'opponent:DCL' ? { ...p, roleId: undefined } : p,
    );
    const targets = computeTargets({ ...central, players });
    const shift = FM26_DATA.lineShift['C-F'].dy;
    const others = players.filter((p) => p.team === 'opponent' && p.id !== 'opponent:DCL');
    for (const keeper of others.filter((p) => p.isKeeper)) {
      expect(targets.get(keeper.id)).toEqual(keeper.base);
    }
    for (const player of others.filter((p) => !p.isKeeper)) {
      const target = targets.get(player.id)!;
      expect(target.x).toBeCloseTo(player.base.x);
      expect(target.y).toBeCloseTo(player.base.y + shift);
    }
    const dcl = players.find((p) => p.id === 'opponent:DCL')!;
    const [, wide, depth] = offsetFor(FM26_DATA.movement, dcl.roleId!, 'C-F', 'ball')!;
    const target = targets.get(dcl.id)!;
    expect(target.x).toBeCloseTo(dcl.base.x + wide * Math.sign(dcl.base.x - PITCH_W / 2));
    expect(target.y).toBeCloseTo(dcl.base.y + shift + depth);
  });

  it('keeps every target inside the pitch margin for every formation, zone and attacker', () => {
    const outside: string[] = [];
    for (const attacker of ['mine', 'opponent'] as const) {
      for (let index = 0; index < FM26_DATA.formations.length; index += 1) {
        for (const zone of ZONE_IDS) {
          for (const [id, point] of computeTargets(input(attacker, zone, index))) {
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
    const mine = computeTargets(input('mine', 'R-F'));
    const opponent = computeTargets(input('opponent', 'R-F'));
    for (const [id, point] of mine) {
      const swapped = id.startsWith('mine:')
        ? id.replace('mine:', 'opponent:')
        : id.replace('opponent:', 'mine:');
      const other = opponent.get(swapped)!;
      expect(other.x).toBeCloseTo(PITCH_W - point.x);
      expect(other.y).toBeCloseTo(100 - point.y);
    }
  });
});
