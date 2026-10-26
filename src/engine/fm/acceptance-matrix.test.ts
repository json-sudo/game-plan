import { describe, expect, it } from 'vitest';
import referenceJson from './fixtures/reference-openings.json';
import { FM26_DATA } from '../../data/fm26';
import type { FormationDef, Side } from '../../data/types';
import { GRID, ZONE_IDS, type ZoneId } from '../../data/zones';
import {
  FORMATIONS,
  availableRoles,
  defaultRoles,
  defendingSide,
  describeConfig,
  inputOf,
  mulberry32,
  pairInput,
  violationsOf,
  type RoleMap,
} from '../../test-utils/matrix';
import { SCENARIOS, type Scenario } from '../../test-utils/role-scenarios';
import { formationById, mirrorSlots, mirrorZone } from '../../test-utils/squad';
import { PITCH_W } from '../geometry/pitch';
import { layoutFormation } from '../layout/formations';
import { visualizationsFor, type Visualization, type VisualizationInput } from './visualization';

const MIRROR_TOLERANCE = 0.01;
const CENTRED_STARTER_TOLERANCE = 0.5;
const SEEDS = Array.from({ length: 24 }, (_, index) => 1000 + index);
const STRUCTURAL_LANES = ['C', 'LH', 'R'] as const;
const UNOPPOSED_ROLE_PARTNER = '4_2_3_1_dm_wide';
const SLOW_TEST_MS = 120_000;
const BASELINE_FINAL_THIRD_DEPTH = -30;
const BASELINE_EDGE_MARGIN = 4;
const BASELINE_DEFENCE_KEEPER_FOLLOW = 0.2;
const BASELINE_DEFENCE_FINAL_THIRD_DEPTH = 2;

const reference = referenceJson as {
  formations: Record<Side, string>;
  roles: RoleMap;
};
const REFERENCE_FORMATIONS: Record<Side, FormationDef> = {
  mine: formationById(reference.formations.mine),
  opponent: formationById(reference.formations.opponent),
};
const STRUCTURAL_ZONES = ZONE_IDS.filter((zone) =>
  STRUCTURAL_LANES.some((lane) => zone.startsWith(`${lane}-`)),
);

function failures(input: VisualizationInput, requireStarter: boolean): string[] {
  const all = visualizationsFor(input);
  const found = all.flatMap((vis) => violationsOf(input, vis));
  if (requireStarter && all.length === 0) found.push('no eligible starter');
  return found.map((message) => `${describeConfig(input)} -> ${message}`);
}

function failuresAcross(inputs: Iterable<VisualizationInput>, requireStarter = true): string[] {
  return [...inputs].flatMap((input) => failures(input, requireStarter));
}

function* defaultInputs(): Generator<VisualizationInput> {
  for (const [index, attack] of FORMATIONS.entries()) {
    const defence = FORMATIONS[(index + 5) % FORMATIONS.length];
    for (const zone of ZONE_IDS) {
      yield pairInput(zone, attack, null);
      yield pairInput(zone, attack, defence, 'mine');
      yield pairInput(zone, attack, defence, 'opponent');
    }
  }
}

function mirroredTwin(input: VisualizationInput): VisualizationInput {
  const twins = (formation: FormationDef | null) => (formation ? mirrorSlots(formation) : {});
  const mapped = Object.fromEntries(
    (['mine', 'opponent'] as const).flatMap((team) => {
      const slotTwins = twins(input.formations[team]);
      return Object.entries(input.roles)
        .filter(([key]) => key.startsWith(`${team}:`))
        .map(([key, role]) => [`${team}:${slotTwins[key.slice(team.length + 1)]}`, role]);
    }),
  );
  return { ...input, zone: mirrorZone(input.zone), roles: mapped };
}

function twinId(input: VisualizationInput, id: string): string {
  const team = id.split(':')[0] as Side;
  const formation = input.formations[team]!;
  return `${team}:${mirrorSlots(formation)[id.slice(team.length + 1)]}`;
}

function mirrorGaps(input: VisualizationInput): string[] {
  const original = visualizationsFor(input);
  const mirrored = visualizationsFor(mirroredTwin(input));
  const found: string[] = [];
  if (original.length !== mirrored.length) {
    found.push(`starter count ${original.length} vs ${mirrored.length}`);
  }
  for (const vis of original) {
    if (
      Math.abs(vis.opening.positions[vis.starterId].x - PITCH_W / 2) < CENTRED_STARTER_TOLERANCE
    ) {
      continue;
    }
    const twin = mirrored.find((item) => item.starterId === twinId(input, vis.starterId));
    if (!twin) {
      found.push(`no mirrored starter for ${vis.starterId}`);
      continue;
    }
    for (const [id, point] of Object.entries(vis.opening.positions)) {
      const other = twin.opening.positions[twinId(input, id)];
      const gap = Math.max(Math.abs(PITCH_W - other.x - point.x), Math.abs(other.y - point.y));
      if (gap >= MIRROR_TOLERANCE)
        found.push(`${vis.starterId} ${id} mirror gap ${gap.toFixed(3)}`);
    }
  }
  return found.map((message) => `${describeConfig(input)} -> ${message}`);
}

function overlay(base: RoleMap, team: Side, roles: Readonly<Record<string, string>>): RoleMap {
  return {
    ...base,
    ...Object.fromEntries(Object.entries(roles).map(([slot, role]) => [`${team}:${slot}`, role])),
  };
}

function scenarioInput(scenario: Scenario, zone: ZoneId): VisualizationInput {
  const formation = formationById(scenario.formation);
  const partner = formationById(UNOPPOSED_ROLE_PARTNER);
  const attackerTeam: Side = 'mine';
  const formations: Record<Side, FormationDef | null> = scenario.defending
    ? { mine: partner, opponent: formation }
    : { mine: formation, opponent: partner };
  const team: Side = scenario.defending ? defendingSide(attackerTeam) : attackerTeam;
  return inputOf(
    zone,
    attackerTeam,
    formations,
    overlay(defaultRoles(formations, 'mine'), team, scenario.roles),
  );
}

function mirroredScenarioInput(scenario: Scenario, zone: ZoneId): VisualizationInput {
  const base = scenarioInput(scenario, zone);
  return mirroredTwin(base);
}

describe('default-role matrix', () => {
  it(
    'keeps every formation, zone, attacker and opposition choice valid for every starter',
    () => {
      expect(failuresAcross(defaultInputs())).toEqual([]);
    },
    SLOW_TEST_MS,
  );

  it('repeats identically with the same starters, order and pass choices', () => {
    for (const input of defaultInputs()) {
      if (input.zone !== 'LH-M' && input.zone !== 'C-F') continue;
      expect(visualizationsFor(input)).toEqual(visualizationsFor(input));
    }
  });

  it(
    'mirrors every formation across the pitch within 0.01 units',
    () => {
      const gaps = [...defaultInputs()]
        .filter((input) => input.zone.startsWith('LH-') || input.zone.startsWith('L-'))
        .flatMap(mirrorGaps);
      expect(gaps).toEqual([]);
    },
    SLOW_TEST_MS,
  );
});

describe('reference-role matrix', () => {
  const referenceInput = (zone: ZoneId) =>
    inputOf(zone, 'mine', REFERENCE_FORMATIONS, reference.roles);

  it('keeps the reference attack valid in all 15 zones', () => {
    expect(failuresAcross(ZONE_IDS.map(referenceInput))).toEqual([]);
  });

  it(
    'keeps the reference attack valid against every opposing formation in all 15 zones',
    () => {
      const inputs = FORMATIONS.flatMap((defence) =>
        ZONE_IDS.map((zone) => {
          const formations = { mine: REFERENCE_FORMATIONS.mine, opponent: defence };
          return inputOf(zone, 'mine', formations, {
            ...defaultRoles(formations, 'mine'),
            ...Object.fromEntries(
              Object.entries(reference.roles).filter(([key]) => key.startsWith('mine:')),
            ),
          });
        }),
      );
      expect(failuresAcross(inputs)).toEqual([]);
    },
    SLOW_TEST_MS,
  );

  it(
    'keeps every attacking formation valid against the reference defence in all 15 zones',
    () => {
      const inputs = FORMATIONS.flatMap((attack) =>
        ZONE_IDS.map((zone) => {
          const formations = { mine: attack, opponent: REFERENCE_FORMATIONS.opponent };
          return inputOf(zone, 'mine', formations, {
            ...defaultRoles(formations, 'mine'),
            ...Object.fromEntries(
              Object.entries(reference.roles).filter(([key]) => key.startsWith('opponent:')),
            ),
          });
        }),
      );
      expect(failuresAcross(inputs)).toEqual([]);
    },
    SLOW_TEST_MS,
  );

  it('keeps the reference matchup valid when the opponent attacks', () => {
    const formations = { mine: REFERENCE_FORMATIONS.mine, opponent: REFERENCE_FORMATIONS.opponent };
    expect(failuresAcross(ZONE_IDS.map((zone) => inputOf(zone, 'opponent', formations)))).toEqual(
      [],
    );
  });
});

describe('12x12 structural pairings', () => {
  it(
    'keeps every attack against every defence valid in each third and representative lane',
    () => {
      expect(STRUCTURAL_ZONES).toHaveLength(GRID.thirds.length * STRUCTURAL_LANES.length);
      const inputs = FORMATIONS.flatMap((attack) =>
        FORMATIONS.flatMap((defence) =>
          STRUCTURAL_ZONES.map((zone) => pairInput(zone, attack, defence)),
        ),
      );
      expect(failuresAcross(inputs)).toEqual([]);
    },
    SLOW_TEST_MS * 4,
  );
});

describe('per-role matrix', () => {
  function slotFor(role: { id: string; possession: 'in' | 'out' }) {
    for (const formation of FORMATIONS) {
      const slot = formation.slots.find((candidate) =>
        availableRoles(formation, candidate.id, role.possession).some(
          (item) => item.id === role.id,
        ),
      );
      if (slot) return { formation, slot };
    }
    return null;
  }

  const slotFamilies = new Set(
    FORMATIONS.flatMap((formation) => formation.slots.map((s) => s.family)),
  );
  const placeableRoles = FM26_DATA.roles.filter((role) =>
    role.families.some((family) => slotFamilies.has(family)),
  );

  it('offers every role whose family has a slot in at least one valid slot', () => {
    const homeless = placeableRoles.filter((role) => !slotFor(role)).map((role) => role.id);
    expect(homeless).toEqual([]);
  });

  it(
    'keeps every role valid in a valid slot across all 15 zones',
    () => {
      const inputs = placeableRoles.flatMap((role) => {
        const home = slotFor(role);
        if (!home) return [];
        const partner = FORMATIONS.find((formation) => formation.id !== home.formation.id)!;
        const attacking = role.possession === 'in';
        const formations = attacking
          ? { mine: home.formation, opponent: partner }
          : { mine: partner, opponent: home.formation };
        const team: Side = attacking ? 'mine' : 'opponent';
        const roles = {
          ...defaultRoles(formations, 'mine'),
          [`${team}:${home.slot.id}`]: role.id,
        };
        return ZONE_IDS.map((zone) => inputOf(zone, 'mine', formations, roles));
      });
      expect(failuresAcross(inputs, false)).toEqual([]);
    },
    SLOW_TEST_MS,
  );
});

describe('interaction matrix', () => {
  it(
    'keeps every interaction case valid in all 15 zones in both mirrors',
    () => {
      const inputs = SCENARIOS.flatMap((scenario) =>
        ZONE_IDS.flatMap((zone) => [
          scenarioInput(scenario, zone),
          mirroredScenarioInput(scenario, zone),
        ]),
      );
      expect(failuresAcross(inputs, false)).toEqual([]);
    },
    SLOW_TEST_MS,
  );

  it(
    'mirrors every interaction case with an off-centre starter within 0.01 units',
    () => {
      expect(
        SCENARIOS.flatMap((scenario) =>
          ZONE_IDS.flatMap((zone) => mirrorGaps(scenarioInput(scenario, zone))),
        ),
      ).toEqual([]);
    },
    SLOW_TEST_MS,
  );
});

describe('seeded mixed-role configurations', () => {
  function seededInput(seed: number): VisualizationInput {
    const next = mulberry32(seed);
    const pick = <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)];
    const mine = pick(FORMATIONS);
    const opponent = next() < 0.25 ? null : pick(FORMATIONS);
    const attacker: Side = opponent && next() < 0.5 ? 'opponent' : 'mine';
    const formations = { mine, opponent };
    const roles: RoleMap = Object.fromEntries(
      (['mine', 'opponent'] as const).flatMap((team) =>
        (formations[team]?.slots ?? []).map((slot) => {
          const choices = availableRoles(
            formations[team]!,
            slot.id,
            team === attacker ? 'in' : 'out',
          );
          return [`${team}:${slot.id}`, pick(choices).id];
        }),
      ),
    );
    return inputOf(pick(ZONE_IDS), attacker, formations, roles);
  }

  it('is reproducible from the seed', () => {
    for (const seed of SEEDS) expect(seededInput(seed)).toEqual(seededInput(seed));
  });

  it(
    'keeps every seeded configuration valid and prints the failing config',
    () => {
      expect(failuresAcross(SEEDS.map(seededInput), false)).toEqual([]);
    },
    SLOW_TEST_MS,
  );
});

describe('baseline 50fbff5 placements', () => {
  it('flag a striker behind the opposing keeper that the matrix rejects', () => {
    const attack = formationById('4_3_3_dm_wide');
    const defence = formationById('4_2_3_1_dm_wide');
    const input = pairInput('C-F', attack, defence);
    const mineLayout = layoutFormation(attack, 'mine');
    const defenceLayout = layoutFormation(defence, 'opponent');
    const positions = {
      ...Object.fromEntries(
        attack.slots.map((slot) => {
          const base = mineLayout.get(slot.id)!;
          const y = Math.max(BASELINE_EDGE_MARGIN, base.y + BASELINE_FINAL_THIRD_DEPTH);
          return [`mine:${slot.id}`, { x: base.x, y }];
        }),
      ),
      ...Object.fromEntries(
        defence.slots.map((slot) => {
          const base = defenceLayout.get(slot.id)!;
          const mirrored = { x: PITCH_W - base.x, y: 100 - base.y };
          const y =
            slot.family === 'GK'
              ? mirrored.y + BASELINE_DEFENCE_FINAL_THIRD_DEPTH * BASELINE_DEFENCE_KEEPER_FOLLOW
              : mirrored.y;
          return [`opponent:${slot.id}`, { x: mirrored.x, y: Math.max(BASELINE_EDGE_MARGIN, y) }];
        }),
      ),
    };
    const striker = positions['mine:ST'];
    const vis: Visualization = {
      starterId: 'mine:ST',
      engagerId: null,
      opening: { positions, ball: striker },
      passes: [],
    };
    expect(
      violationsOf(input, vis).some((message) => message.includes('behind the opposing keeper')),
    ).toBe(true);
  });
});
