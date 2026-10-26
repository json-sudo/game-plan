import type { Family, FormationSlot, SlotId } from '../../data/types';
import type { Lane, Third, ZoneId } from '../../data/zones';
import { laneOf, thirdOf } from './zones';

export type LateralSide = 'left' | 'right';

export interface CarrierPlayer {
  id: string;
  roleId: string | undefined;
  family: Family | null;
  slot: SlotId | null;
  side: LateralSide | undefined;
}

type LaneKind = 'flank' | 'halfSpace' | 'centre';
type SideRule = 'zone' | 'any';
type Gate = 'outermostCentreBack' | 'noWideDefenderOnSide' | 'noCentralMidfield';

interface CarrierRule {
  roles?: readonly string[];
  families?: readonly Family[];
  side: SideRule;
  gates?: readonly Gate[];
}

const OVERLAPPING_CENTRE_BACK = 'overlapping_centre_back_ip';
const WIDE_CENTRE_BACK = 'wide_centre_back_ip';
const MIN_CENTRE_BACKS_FOR_OVERLAP = 3;
const OUTERMOST_CENTRE_BACK_ROLES: readonly string[] = [OVERLAPPING_CENTRE_BACK, WIDE_CENTRE_BACK];

const FULL_BACK = 'full_back_ip';
const INSIDE_FULL_BACK = 'inside_full_back_ip';
const WING_BACK = 'wing_back_ip';
const INSIDE_WING_BACK = 'inside_wing_back_ip';
const ADVANCED_WING_BACK = 'advanced_wing_back_ip';
const HALF_BACK = 'half_back_ip';
const CENTRE_BACKS = [
  'centre_back_ip',
  'advanced_centre_back_ip',
  'ball_playing_centre_back_ip',
  'no_nonsense_center_back_ip',
];
const WIDE_CENTRAL_MIDFIELDER = 'wide_central_midfielder_ip';
const WIDE_MIDFIELDER = 'wide_midfielder_ip';
const WINGER = 'winger_ip';
const INSIDE_FORWARD = 'inside_forward_ip';
const PLAYMAKING_WINGER = 'playmaking_winger_ip';
const WIDE_FORWARD = 'wide_forward_ip';
const INSIDE_WINGER = 'inside_winger_ip';
const CHANNEL_MIDFIELDER = 'channel_midfielder_ip';
const CENTRAL_MIDFIELDER = 'central_midfielder_ip';
const MIDFIELD_PLAYMAKER = 'midfield_playmaker_ip';
const ATTACKING_MIDFIELDER = 'attacking_midfielder_ip';
const ADVANCED_PLAYMAKER = 'advanced_playmaker_ip';
const FREE_ROLE = 'free_role_ip';
const FALSE_NINE = 'false_nine_ip';
const SECOND_STRIKER = 'second_striker_ip';

const STRIKER_FAMILIES: readonly Family[] = ['ST'];
const CENTRAL_FAMILIES: readonly Family[] = ['M(C)', 'AM(C)'];
const CENTRAL_MIDFIELD_FAMILIES: readonly Family[] = ['M(C)'];
const WING_BACK_FAMILIES: readonly Family[] = ['WB(L)', 'WB(R)'];
const SECOND_STRIKER_FAMILIES: readonly Family[] = ['AM(C)'];
const WIDE_DEFENDER_FAMILIES: readonly Family[] = ['D(L)', 'D(R)', 'WB(L)', 'WB(R)'];
const CENTRE_BACK_FAMILIES: readonly Family[] = ['D(C)'];
const DEFENSIVE_MIDFIELD_FAMILIES: readonly Family[] = ['DM'];
const MIDDLE_HALF_SPACE_FALLBACK_FAMILIES: readonly Family[] = ['DM', 'AM(C)'];

const MIDDLE_WIDE_ROLES = [FULL_BACK, WING_BACK, WIDE_CENTRAL_MIDFIELDER, WIDE_MIDFIELDER];

const CARRIER_RULES: Record<Third, Record<LaneKind, readonly CarrierRule[]>> = {
  D: {
    flank: [
      { roles: [FULL_BACK, INSIDE_WING_BACK, WING_BACK, INSIDE_FULL_BACK], side: 'zone' },
      {
        roles: [OVERLAPPING_CENTRE_BACK, WIDE_CENTRE_BACK],
        side: 'zone',
        gates: ['outermostCentreBack'],
      },
      {
        families: CENTRE_BACK_FAMILIES,
        side: 'zone',
        gates: ['outermostCentreBack', 'noWideDefenderOnSide'],
      },
    ],
    halfSpace: [
      { roles: [FULL_BACK, INSIDE_FULL_BACK], side: 'zone' },
      { roles: [HALF_BACK], side: 'any' },
      { roles: CENTRE_BACKS, side: 'zone' },
      {
        roles: [OVERLAPPING_CENTRE_BACK, WIDE_CENTRE_BACK],
        side: 'zone',
        gates: ['outermostCentreBack'],
      },
    ],
    centre: [
      { roles: [HALF_BACK, ...CENTRE_BACKS], side: 'any' },
      { roles: [OVERLAPPING_CENTRE_BACK], side: 'any', gates: ['outermostCentreBack'] },
    ],
  },
  M: {
    flank: [
      {
        roles: [
          ...MIDDLE_WIDE_ROLES,
          WINGER,
          INSIDE_FORWARD,
          PLAYMAKING_WINGER,
          WIDE_FORWARD,
          INSIDE_WINGER,
        ],
        side: 'zone',
      },
    ],
    halfSpace: [
      {
        roles: [...MIDDLE_WIDE_ROLES, INSIDE_FORWARD, INSIDE_WINGER, PLAYMAKING_WINGER],
        side: 'zone',
      },
      { roles: [CHANNEL_MIDFIELDER], families: CENTRAL_FAMILIES, side: 'any' },
      { roles: [CENTRAL_MIDFIELDER], families: CENTRAL_MIDFIELD_FAMILIES, side: 'any' },
      {
        families: MIDDLE_HALF_SPACE_FALLBACK_FAMILIES,
        side: 'zone',
        gates: ['noWideDefenderOnSide'],
      },
    ],
    centre: [
      {
        roles: [
          CENTRAL_MIDFIELDER,
          MIDFIELD_PLAYMAKER,
          ATTACKING_MIDFIELDER,
          ADVANCED_PLAYMAKER,
          FREE_ROLE,
          FALSE_NINE,
        ],
        side: 'any',
      },
      { families: DEFENSIVE_MIDFIELD_FAMILIES, side: 'any', gates: ['noCentralMidfield'] },
    ],
  },
  F: {
    flank: [
      { roles: [WINGER, INSIDE_FORWARD, WIDE_FORWARD, INSIDE_WINGER, WING_BACK], side: 'zone' },
      { roles: [ADVANCED_WING_BACK], families: WING_BACK_FAMILIES, side: 'zone' },
    ],
    halfSpace: [
      {
        roles: [CHANNEL_MIDFIELDER],
        families: CENTRAL_FAMILIES,
        side: 'any',
      },
      { roles: [CENTRAL_MIDFIELDER], families: CENTRAL_MIDFIELD_FAMILIES, side: 'any' },
      { families: STRIKER_FAMILIES, side: 'any' },
      { roles: [SECOND_STRIKER, ATTACKING_MIDFIELDER, ADVANCED_PLAYMAKER], side: 'any' },
      { roles: [INSIDE_FORWARD, INSIDE_WINGER, PLAYMAKING_WINGER], side: 'zone' },
    ],
    centre: [
      { families: STRIKER_FAMILIES, side: 'any' },
      { roles: [SECOND_STRIKER], families: SECOND_STRIKER_FAMILIES, side: 'any' },
    ],
  },
};

const LANE_KINDS: Record<Lane, LaneKind> = {
  L: 'flank',
  LH: 'halfSpace',
  C: 'centre',
  RH: 'halfSpace',
  R: 'flank',
};

const LANE_SIDES: Record<Lane, LateralSide | undefined> = {
  L: 'left',
  LH: 'left',
  C: undefined,
  RH: 'right',
  R: 'right',
};

function outermostCentreBacks(slots: readonly FormationSlot[]): ReadonlySet<SlotId> {
  const centreBacks = slots.filter((slot) => slot.family === 'D(C)');
  if (centreBacks.length < MIN_CENTRE_BACKS_FOR_OVERLAP) return new Set();
  const xs = centreBacks.map((slot) => slot.base.x);
  const [low, high] = [Math.min(...xs), Math.max(...xs)];
  return new Set(
    centreBacks
      .filter((slot) => slot.base.x === low || slot.base.x === high)
      .map((slot) => slot.id),
  );
}

export function isRoleAllowedInSlot(
  roleId: string,
  slot: SlotId | null,
  slots: readonly FormationSlot[],
): boolean {
  if (!OUTERMOST_CENTRE_BACK_ROLES.includes(roleId)) return true;
  return slot !== null && outermostCentreBacks(slots).has(slot);
}

interface FormationFacts {
  outermost: ReadonlySet<SlotId>;
  wideDefenderSides: ReadonlySet<LateralSide>;
  hasCentralMidfield: boolean;
}

function wideDefenderSides(slots: readonly FormationSlot[]): ReadonlySet<LateralSide> {
  return new Set(
    slots
      .filter((slot) => WIDE_DEFENDER_FAMILIES.includes(slot.family))
      .map((slot): LateralSide => (slot.family.endsWith('(L)') ? 'left' : 'right')),
  );
}

function formationFacts(slots: readonly FormationSlot[]): FormationFacts {
  return {
    outermost: outermostCentreBacks(slots),
    wideDefenderSides: wideDefenderSides(slots),
    hasCentralMidfield: slots.some((slot) => CENTRAL_FAMILIES.includes(slot.family)),
  };
}

function passesGate(
  gate: Gate,
  player: CarrierPlayer,
  zoneSide: LateralSide | undefined,
  facts: FormationFacts,
): boolean {
  switch (gate) {
    case 'outermostCentreBack':
      return player.slot !== null && facts.outermost.has(player.slot);
    case 'noWideDefenderOnSide':
      return zoneSide !== undefined && !facts.wideDefenderSides.has(zoneSide);
    case 'noCentralMidfield':
      return !facts.hasCentralMidfield;
  }
}

function matches(
  rule: CarrierRule,
  player: CarrierPlayer & { roleId: string },
  zoneSide: LateralSide | undefined,
  facts: FormationFacts,
): boolean {
  if (rule.roles && !rule.roles.includes(player.roleId)) return false;
  if (rule.families && (player.family === null || !rule.families.includes(player.family))) {
    return false;
  }
  if (rule.side === 'zone' && player.side !== zoneSide) return false;
  return (rule.gates ?? []).every((gate) => passesGate(gate, player, zoneSide, facts));
}

export function eligibleCarrierIds(
  zone: ZoneId,
  players: readonly CarrierPlayer[],
  slots: readonly FormationSlot[],
): string[] {
  const lane = laneOf(zone);
  const rules = CARRIER_RULES[thirdOf(zone)][LANE_KINDS[lane]];
  const zoneSide = LANE_SIDES[lane];
  const facts = formationFacts(slots);
  return players.flatMap(({ roleId, ...player }) => {
    if (roleId === undefined) return [];
    const candidate = { ...player, roleId };
    return rules.some((rule) => matches(rule, candidate, zoneSide, facts)) ? [player.id] : [];
  });
}
