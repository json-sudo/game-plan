import { describe, expect, it } from 'vitest';
import { dataSetSchema } from '../schemas';
import { FAMILIES, SLOT_IDS, type Family, type SlotId } from '../types';
import { ZONE_IDS } from '../zones';
import { DATA_VERSION, FM26_DATA, FORMATIONS, LINE_SHIFT, MOVEMENT, ROLES } from './index';

const PITCH_W = 76.19;

const WIDE_MIDFIELDER_ROLE_IDS = [
  'wide_midfielder_ip',
  'wide_midfielder_oop',
  'tracking_wide_midfielder_oop',
  'wide_outlet_wide_midfielder_oop',
];

const AM_SIDE_FROM_TABLE: Record<string, Partial<Record<SlotId, Family>>> = {
  '4_3_3_dm_wide': { AMCR: 'AM(R)', AMCL: 'AM(L)' },
  '4_2_3_1_dm_wide': { AML: 'AM(L)', AMC: 'AM(C)', AMR: 'AM(R)' },
  '4_4_2_diamond_narrow': { AMC: 'AM(C)' },
  '4_2_4_dm_wide': { AML: 'AM(L)', AMR: 'AM(R)' },
  '4_2_2_2_dm_wide': { AML: 'AM(L)', AMR: 'AM(R)' },
  '4_2_2_2_am_narrow': { AMCR: 'AM(R)', AMCL: 'AM(L)' },
  '4_3_2_1_dm_narrow': { AMCR: 'AM(R)', AMCL: 'AM(L)' },
  '3_4_3_dm_wide': { AMCR: 'AM(R)', AMCL: 'AM(L)' },
  '3_4_3_dm_narrow': { AMCR: 'AM(C)', AMCL: 'AM(C)' },
  '5_2_1_2_dm_wb': { AMC: 'AM(C)' },
  '3_2_4_1': { AML: 'AM(L)', AMCL: 'AM(C)', AMCR: 'AM(C)', AMR: 'AM(R)' },
};

const FM26_FORMATION_IDS = [
  '4_3_3_dm_wide',
  '4_2_3_1_dm_wide',
  '4_4_2_diamond_narrow',
  '4_2_4_dm_wide',
  '4_2_2_2_dm_wide',
  '4_2_2_2_am_narrow',
  '4_3_2_1_dm_narrow',
  '3_4_3_dm_wide',
  '3_4_3_dm_narrow',
  '5_2_1_2_dm_wb',
  '5_1_2_2_dm_wb',
  '3_2_4_1',
];

describe('data set', () => {
  it('is versioned and passes the zod schema', () => {
    expect(DATA_VERSION).toBe('fm26-1');
    expect(FM26_DATA.version).toBe(DATA_VERSION);
    expect(dataSetSchema.safeParse(FM26_DATA).success).toBe(true);
  });
});

describe('roles', () => {
  it('has 74 roles, 39 in possession and 35 out of possession', () => {
    expect(ROLES).toHaveLength(74);
    expect(ROLES.filter((role) => role.possession === 'in')).toHaveLength(39);
    expect(ROLES.filter((role) => role.possession === 'out')).toHaveLength(35);
  });

  it('has unique ids and unique codes of 2 to 4 characters', () => {
    expect(new Set(ROLES.map((role) => role.id)).size).toBe(ROLES.length);
    expect(new Set(ROLES.map((role) => role.code)).size).toBe(ROLES.length);
    for (const role of ROLES) {
      expect(role.code.length).toBeGreaterThanOrEqual(2);
      expect(role.code.length).toBeLessThanOrEqual(4);
    }
  });

  it('only uses valid families', () => {
    for (const role of ROLES) {
      expect(role.families.length).toBeGreaterThan(0);
      for (const family of role.families) expect(FAMILIES).toContain(family);
    }
  });

  it('suffixes in-possession ids with _ip or a variant and out-of-possession ids with _oop', () => {
    for (const role of ROLES) {
      const expected = role.possession === 'in' ? /_ip(_d_l_r)?$/ : /_oop$/;
      expect(role.id).toMatch(expected);
    }
  });

  it('expands paired positions into one family per side', () => {
    const byId = new Map(ROLES.map((role) => [role.id, role]));
    expect(byId.get('wing_back_ip')?.families).toEqual(['D(L)', 'D(R)', 'WB(L)', 'WB(R)']);
    expect(byId.get('inside_forward_ip')?.families).toEqual(['AM(L)', 'AM(R)']);
    expect(byId.get('winger_ip')?.families).toEqual(['AM(L)', 'AM(R)', 'M(L)', 'M(R)']);
    expect(byId.get('advanced_playmaker_ip')?.families).toEqual(['AM(C)', 'M(C)']);
    expect(byId.get('goalkeeper_oop')?.families).toEqual(['GK']);
  });

  it('keeps the captain descriptions verbatim', () => {
    const byId = new Map(ROLES.map((role) => [role.id, role]));
    expect(byId.get('centre_forward_ip')?.description).toBe(
      'Acting as the traditional focal point of the attack, the Centre Forward is tasked with spearheading the In Possession (IP) build-up and serving as the primary finisher within the final third.',
    );
    expect(byId.get('goalkeeper_oop')?.description).toBe(
      'This role centers on securing the goal by neutralizing scoring attempts and intercepting crosses. Acting as the final Out of Possession (OOP) barrier, these players are vital for maintaining defensive stability and achieving clean sheets.',
    );
    for (const role of ROLES) expect(role.description).toBe(role.description.trim());
  });

  it('leaves exactly the four Wide Midfielder roles without an eligible slot', () => {
    const slotFamilies = new Set(FORMATIONS.flatMap((f) => f.slots.map((slot) => slot.family)));
    const orphaned = ROLES.filter((role) => !role.families.some((f) => slotFamilies.has(f)));
    expect(orphaned.map((role) => role.id).sort()).toEqual([...WIDE_MIDFIELDER_ROLE_IDS].sort());
  });

  it('has an eligible role in both possessions for every slot family in use', () => {
    const slotFamilies = new Set(FORMATIONS.flatMap((f) => f.slots.map((slot) => slot.family)));
    const uncovered = [...slotFamilies].flatMap((family) =>
      (['in', 'out'] as const)
        .filter(
          (possession) =>
            !ROLES.some((role) => role.possession === possession && role.families.includes(family)),
        )
        .map((possession) => `${family} ${possession}`),
    );
    expect(uncovered).toEqual([]);
  });
});

describe('formations', () => {
  it('has the 12 FM26 formations in sidebar order', () => {
    expect(FORMATIONS.map((formation) => formation.id)).toEqual(FM26_FORMATION_IDS);
    expect(new Set(FORMATIONS.map((formation) => formation.name)).size).toBe(12);
  });

  it('has 11 slots per formation with unique ids and one goalkeeper', () => {
    const summaries = FORMATIONS.map((formation) => {
      const ids = formation.slots.map((slot) => slot.id);
      return {
        id: formation.id,
        slots: ids.length,
        unique: new Set(ids).size,
        known: ids.every((id) => SLOT_IDS.includes(id)),
        keepers: formation.slots.filter((slot) => slot.family === 'GK').length,
      };
    });
    for (const summary of summaries) {
      expect(summary).toEqual({ id: summary.id, slots: 11, unique: 11, known: true, keepers: 1 });
    }
  });

  it('gives every slot a valid family and a base point inside the pitch', () => {
    for (const formation of FORMATIONS) {
      for (const slot of formation.slots) {
        expect(FAMILIES).toContain(slot.family);
        expect(slot.base.x).toBeGreaterThan(0);
        expect(slot.base.x).toBeLessThan(PITCH_W);
        expect(slot.base.y).toBeGreaterThan(0);
        expect(slot.base.y).toBeLessThanOrEqual(100);
      }
    }
  });

  it('converts site x to pitch units and keeps y', () => {
    const slots = new Map(FORMATIONS[0].slots.map((slot) => [slot.id, slot]));
    expect(slots.get('GK')?.base).toEqual({ x: 38.095, y: 90 });
    expect(slots.get('DCR')?.base).toEqual({ x: 47.61875, y: 75 });
    expect(slots.get('DL')?.base).toEqual({ x: 11.4285, y: 71.5 });
  });

  it('sets the attacking midfield family from x, matching the formations table', () => {
    for (const formation of FORMATIONS) {
      const actual = Object.fromEntries(
        formation.slots.filter((s) => s.id.startsWith('AM')).map((slot) => [slot.id, slot.family]),
      );
      expect(actual).toEqual(AM_SIDE_FROM_TABLE[formation.id] ?? {});
      for (const slot of formation.slots.filter((s) => s.id.startsWith('AM'))) {
        const siteX = (slot.base.x / PITCH_W) * 100;
        const rule = siteX < 35 ? 'AM(L)' : siteX > 65 ? 'AM(R)' : 'AM(C)';
        expect(slot.family).toBe(rule);
      }
    }
  });

  it('shows one label for paired slots', () => {
    const family = (formationId: string, slotId: SlotId) =>
      FORMATIONS.find((f) => f.id === formationId)?.slots.find((s) => s.id === slotId)?.family;
    expect(family('4_2_3_1_dm_wide', 'DML')).toBe('DM');
    expect(family('4_2_3_1_dm_wide', 'DMR')).toBe('DM');
    expect(family('4_4_2_diamond_narrow', 'STL')).toBe('ST');
    expect(family('4_4_2_diamond_narrow', 'MCL')).toBe('M(C)');
    expect(family('3_4_3_dm_wide', 'DCL')).toBe('D(C)');
    expect(family('3_4_3_dm_wide', 'WBR')).toBe('WB(R)');
  });
});

describe('movement table', () => {
  const roleIds = new Set(ROLES.map((role) => role.id));

  it('only keys real roles and real zones', () => {
    const unknownRoles = Object.keys(MOVEMENT).filter((roleId) => !roleIds.has(roleId));
    const unknownZones = Object.values(MOVEMENT)
      .flatMap((zones) => Object.keys(zones ?? {}))
      .filter((zone) => !ZONE_IDS.some((id) => id === zone));
    expect(unknownRoles).toEqual([]);
    expect(unknownZones).toEqual([]);
  });

  it('has an entry for every role in every zone, with both sides and provenance', () => {
    const problems = ROLES.flatMap((role) =>
      ZONE_IDS.filter((zone) => {
        const cell = MOVEMENT[role.id]?.[zone];
        const provenance = ['spike', 'initial'];
        return !(
          cell &&
          provenance.includes(cell.from.ball) &&
          provenance.includes(cell.from.far) &&
          cell.ball.every(Number.isInteger) &&
          cell.far.every(Number.isInteger)
        );
      }).map((zone) => `${role.id} ${zone}`),
    );
    expect(problems).toEqual([]);
  });

  it('keeps the spike values for the three tuned zones of spike roles', () => {
    expect(MOVEMENT.winger_ip?.['R-F']?.ball).toEqual([3, 0, 6]);
    expect(MOVEMENT.winger_ip?.['R-F']?.from.ball).toBe('spike');
    expect(MOVEMENT.winger_ip?.['C-M']?.ball).toEqual([0, 2, 3]);
    expect(MOVEMENT.winger_ip?.['C-D']?.ball).toEqual([0, 2, -3]);
    expect(MOVEMENT.sweeper_keeper_oop?.['C-D']?.ball).toEqual([0, 0, 6]);
    expect(MOVEMENT.stopping_centre_back_oop?.['R-F']?.ball).toEqual([3, 0, 4]);
    expect(MOVEMENT.deep_lying_forward_ip?.['R-F']?.ball).toEqual([-4, 0, -2]);
  });

  it('marks only the three tuned zones of spike roles as spike', () => {
    const spikeCells = Object.values(MOVEMENT).flatMap((zones) =>
      Object.entries(zones ?? {}).filter(([, cell]) => cell?.from.ball === 'spike'),
    );
    expect(spikeCells).toHaveLength(36 * 3);
    expect(new Set(spikeCells.map(([zone]) => zone))).toEqual(new Set(['R-F', 'C-M', 'C-D']));
  });

  it('gives wide roles a different far side outside the centre lane', () => {
    const winger = MOVEMENT.winger_ip;
    expect(winger?.['R-F']?.far).not.toEqual(winger?.['R-F']?.ball);
    expect(winger?.['L-M']?.far).not.toEqual(winger?.['L-M']?.ball);
    expect(winger?.['C-M']?.far).toEqual(winger?.['C-M']?.ball);
    const fullBack = MOVEMENT.full_back_oop;
    expect(fullBack?.['R-F']?.far).not.toEqual(fullBack?.['R-F']?.ball);
  });

  it('keeps centre roles identical on both sides', () => {
    const striker = MOVEMENT.poacher_ip;
    for (const zone of ZONE_IDS) expect(striker?.[zone]?.far).toEqual(striker?.[zone]?.ball);
  });
});

describe('line shift table', () => {
  it('has a finite entry for every zone', () => {
    for (const zone of ZONE_IDS) {
      expect(Number.isFinite(LINE_SHIFT[zone].dy)).toBe(true);
      expect(LINE_SHIFT[zone].from).toBe('initial');
    }
  });

  it('pushes the line up when the ball is deep and drops it when the ball is high', () => {
    expect(LINE_SHIFT['C-D'].dy).toBeGreaterThan(0);
    expect(LINE_SHIFT['C-F'].dy).toBeLessThan(0);
  });
});

describe('data schemas', () => {
  it('rejects a role with an unknown family', () => {
    const broken = { ...FM26_DATA, roles: [{ ...ROLES[0], families: ['XX'] }] };
    expect(dataSetSchema.safeParse(broken).success).toBe(false);
  });

  it('rejects a movement cell with a malformed offset', () => {
    const broken = {
      ...FM26_DATA,
      movement: { poacher_ip: { 'R-F': { ...MOVEMENT.poacher_ip?.['R-F'], ball: [1, 2] } } },
    };
    expect(dataSetSchema.safeParse(broken).success).toBe(false);
  });
});
