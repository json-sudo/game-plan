import type { Third } from '../../data/zones';
import type { SlotLine } from './formation-anchors';

export type Depths = Record<Third, number>;

export interface LineDepth {
  line: SlotLine | 'own';
  dy: number;
  range?: Partial<Record<Third, readonly [number, number]>>;
}

export type DepthRule = Depths | LineDepth;

export type LateralRule =
  | 'slot'
  | 'split'
  | { edge: number; centre?: 'follow' }
  | { follow: number }
  | { ballEdge: number; farEdge: number | 'slot' };

export type LateralByThird = Record<Third, LateralRule>;

export interface RoleProfile {
  y: DepthRule;
  x: LateralRule | LateralByThird;
}

export const FLANK = 9;
export const HALF_SPACE = 22;

export const depths = (d: number, m: number, f: number): Depths => ({ D: d, M: m, F: f });
const line = (name: SlotLine | 'own', dy = 0, range?: LineDepth['range']): LineDepth => ({
  line: name,
  dy,
  range,
});
const edge = (x: number, centre?: 'follow'): LateralRule => ({ edge: x, centre });
const keeper = (depth: number): RoleProfile => ({ y: depths(depth, depth, depth), x: 'slot' });
const profile = (y: DepthRule, x: LateralRule | LateralByThird = 'slot'): RoleProfile => ({ y, x });

export const ROLE_REGIONS: Readonly<Record<string, RoleProfile>> = {
  deep_lying_forward_ip: profile(depths(48, 37, 27)),
  centre_forward_ip: profile(line('ST')),
  target_forward_ip: profile(line('ST')),
  poacher_ip: profile(depths(44, 27, 18)),
  channel_forward_ip: profile(line('ST')),
  false_nine_ip: profile(depths(63, 40, 28)),
  winger_ip: profile(line('WA'), edge(FLANK)),
  inside_forward_ip: profile(line('WA')),
  playmaking_winger_ip: profile(line('WA', 4), edge(HALF_SPACE)),
  wide_forward_ip: profile(line('WA')),
  inside_winger_ip: profile(line('WA', 3), edge(HALF_SPACE)),
  attacking_midfielder_ip: profile(line('AM')),
  advanced_playmaker_ip: profile(line('AM', 2)),
  free_role_ip: profile(line('AM'), { follow: HALF_SPACE }),
  second_striker_ip: profile(line('ST', 5)),
  channel_midfielder_ip: profile(line('own', 0, { F: [25, 30] }), edge(HALF_SPACE, 'follow')),
  wide_midfielder_ip: profile(line('WM')),
  central_midfielder_ip: profile(line('CM')),
  wide_central_midfielder_ip: profile(line('CM'), { ballEdge: 12, farEdge: HALF_SPACE }),
  midfield_playmaker_ip: profile(line('CM', 3)),
  wing_back_ip: profile(depths(70, 49, 27), edge(FLANK)),
  advanced_wing_back_ip: profile(depths(31, 27, 23), edge(FLANK)),
  inside_wing_back_ip: profile(depths(71, 56, 45), edge(30)),
  playmaking_wing_back_ip: profile(depths(70, 52, 39), edge(HALF_SPACE)),
  playmaking_wing_back_ip_d_l_r: profile(depths(70, 52, 39), edge(HALF_SPACE)),
  defensive_midfielder_ip: profile(line('DM')),
  deep_lying_playmaker_ip: profile(line('DM')),
  box_to_box_midfielder_ip: profile(line('AM', 3)),
  box_to_box_playmaker_ip: profile(line('AM', 5)),
  half_back_ip: profile(line('CB')),
  full_back_ip: profile(line('FB')),
  inside_full_back_ip: profile(line('CB'), edge(HALF_SPACE)),
  centre_back_ip: profile(line('CB')),
  advanced_centre_back_ip: profile(line('DM')),
  ball_playing_centre_back_ip: profile(line('CB')),
  no_nonsense_center_back_ip: profile(line('CB')),
  no_nonsense_goalkeeper_ip: keeper(96),
  ball_playing_goalkeeper_ip: keeper(92),
  goalkeeper_ip: keeper(96),
  wide_centre_back_ip: profile(line('CB'), edge(HALF_SPACE)),
  overlapping_centre_back_ip: profile(depths(82, 49, 27), {
    D: edge(HALF_SPACE),
    M: edge(12),
    F: edge(FLANK),
  }),
  centre_forward_oop: profile(line('ST')),
  tracking_centre_forward_oop: profile(depths(77, 52, 38)),
  central_outlet_centre_forward_oop: profile(depths(79, 62, 48)),
  winger_oop: profile(depths(60, 43, 32), edge(16)),
  tracking_winger_oop: profile(depths(61, 44, 30), edge(16)),
  inside_outlet_winger_oop: profile(depths(67, 52, 43), edge(HALF_SPACE)),
  wide_outlet_winger_oop: profile(depths(67, 52, 43), edge(12)),
  splitting_outlet_centre_forward_oop: profile(depths(79, 62, 48), 'split'),
  tracking_attacking_midfielder_oop: profile(depths(63, 42, 31)),
  central_outlet_attacking_midfielder_oop: profile(depths(67, 52, 43)),
  splitting_outlet_attacking_midfielder_oop: profile(depths(67, 52, 43), 'split'),
  attacking_midfielder_oop: profile(line('AM')),
  wide_midfielder_oop: profile(depths(60, 43, 32), edge(16)),
  tracking_wide_midfielder_oop: profile(depths(58, 40, 28), edge(16)),
  wide_outlet_wide_midfielder_oop: profile(depths(67, 52, 43), edge(12)),
  central_midfielder_oop: profile(line('CM')),
  pressing_central_midfielder_oop: profile(line('CM')),
  screening_central_midfielder_oop: profile(line('CM', -3)),
  wide_covering_central_midfielder_oop: profile(line('CM'), {
    ballEdge: HALF_SPACE,
    farEdge: 'slot',
  }),
  wing_back_oop: profile(line('WB')),
  pressing_wing_back_oop: profile(line('WB')),
  holding_wing_back_oop: profile(line('WB', -3)),
  defensive_midfielder_oop: profile(line('DM')),
  dropping_defensive_midfielder_oop: profile(depths(54, 36, 12)),
  screening_defensive_midfielder_oop: profile(line('DM')),
  wide_covering_defensive_midfielder_oop: profile(line('DM'), {
    ballEdge: HALF_SPACE,
    farEdge: 'slot',
  }),
  full_back_oop: profile(line('FB')),
  pressing_full_back_oop: profile(line('FB')),
  holding_full_back_oop: profile(line('FB', -2)),
  centre_back_oop: profile(line('CB')),
  stopping_centre_back_oop: profile(line('CB', 3)),
  covering_centre_back_oop: profile(line('CB', -3)),
  goalkeeper_oop: keeper(4),
  sweeper_keeper_oop: keeper(5),
  line_holding_keeper_oop: keeper(3),
};

export function profileOf(roleId: string | undefined): RoleProfile | undefined {
  return roleId !== undefined && Object.hasOwn(ROLE_REGIONS, roleId)
    ? ROLE_REGIONS[roleId]
    : undefined;
}
