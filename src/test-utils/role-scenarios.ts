import type { RoleAssignments } from './squad';

export interface Scenario {
  name: string;
  formation: string;
  roles: RoleAssignments;
  defending?: boolean;
}

export const TWO_IWB: Scenario = {
  name: 'two inside wing-backs with a double pivot',
  formation: '5_2_1_2_dm_wb',
  roles: { WBL: 'inside_wing_back_ip', WBR: 'inside_wing_back_ip' },
};
export const ONE_IWB: Scenario = {
  name: 'one inside wing-back with a single pivot',
  formation: '5_1_2_2_dm_wb',
  roles: { WBL: 'inside_wing_back_ip' },
};
export const TWO_IFB: Scenario = {
  name: 'two inside full-backs',
  formation: '4_3_3_dm_wide',
  roles: { DL: 'inside_full_back_ip', DR: 'inside_full_back_ip' },
};
export const ONE_IFB: Scenario = {
  name: 'one inside full-back',
  formation: '4_2_3_1_dm_wide',
  roles: { DL: 'inside_full_back_ip' },
};
export const HALF_BACK_IFB: Scenario = {
  name: 'half back with an inside full-back',
  formation: '4_3_3_dm_wide',
  roles: { DM: 'half_back_ip', DL: 'inside_full_back_ip' },
};
export const HALF_BACK_IWB: Scenario = {
  name: 'half back with an inside wing-back',
  formation: '3_4_3_dm_wide',
  roles: { DMCL: 'half_back_ip', WBL: 'inside_wing_back_ip' },
};
export const TWO_HALF_BACKS: Scenario = {
  name: 'two half backs',
  formation: '4_2_3_1_dm_wide',
  roles: { DML: 'half_back_ip', DMR: 'half_back_ip' },
};
export const ADVANCED_CB_IFB: Scenario = {
  name: 'advanced centre-back beside an inside full-back',
  formation: '4_3_3_dm_wide',
  roles: { DCL: 'advanced_centre_back_ip', DL: 'inside_full_back_ip' },
};
export const OCB_WCB: Scenario = {
  name: 'overlapping and wide centre-backs',
  formation: '3_4_3_dm_wide',
  roles: { DCL: 'overlapping_centre_back_ip', DCR: 'wide_centre_back_ip' },
};
export const DROPPING_DMS: Scenario = {
  name: 'multiple dropping defensive midfielders',
  formation: '5_2_1_2_dm_wb',
  roles: { DMCL: 'dropping_defensive_midfielder_oop', DMCR: 'dropping_defensive_midfielder_oop' },
  defending: true,
};
export const R01: Scenario = {
  name: 'winger, wing back and overlapping centre-back (R01)',
  formation: '3_4_3_dm_wide',
  roles: { AMCL: 'winger_ip', WBL: 'wing_back_ip', DCL: 'overlapping_centre_back_ip' },
};
export const AWB_TRIO: Scenario = {
  name: 'winger, advanced wing-back and overlapping centre-back',
  formation: '3_4_3_dm_wide',
  roles: { AMCL: 'winger_ip', WBL: 'advanced_wing_back_ip', DCL: 'overlapping_centre_back_ip' },
};
export const R02: Scenario = {
  name: 'winger, wing back and channel midfielder (R02)',
  formation: '4_3_3_dm_wide',
  roles: { AMCL: 'winger_ip', DL: 'wing_back_ip', MCL: 'channel_midfielder_ip' },
};
export const WINGER_WING_BACK: Scenario = {
  name: 'winger and wing back',
  formation: '3_4_3_dm_wide',
  roles: { AMCL: 'winger_ip', WBL: 'wing_back_ip' },
};
export const OCB_WING_BACK: Scenario = {
  name: 'overlapping centre-back with a wing back',
  formation: '3_4_3_dm_wide',
  roles: { WBL: 'wing_back_ip', DCL: 'overlapping_centre_back_ip' },
};
export const OCB_ADVANCED_WING_BACK: Scenario = {
  name: 'overlapping centre-back with an advanced wing-back',
  formation: '3_4_3_dm_wide',
  roles: { WBL: 'advanced_wing_back_ip', DCL: 'overlapping_centre_back_ip' },
};
export const OCB_WINGER: Scenario = {
  name: 'overlapping centre-back with a winger',
  formation: '3_4_3_dm_wide',
  roles: { AMCL: 'winger_ip', DCL: 'overlapping_centre_back_ip' },
};
export const OCB_ALONE: Scenario = {
  name: 'overlapping centre-back alone',
  formation: '3_4_3_dm_wide',
  roles: { DCL: 'overlapping_centre_back_ip' },
};
export const WINGER_ADVANCED_WING_BACK: Scenario = {
  name: 'winger and advanced wing-back',
  formation: '3_4_3_dm_wide',
  roles: { AMCL: 'winger_ip', WBL: 'advanced_wing_back_ip' },
};

export const SCENARIOS: Scenario[] = [
  TWO_IWB,
  ONE_IWB,
  TWO_IFB,
  ONE_IFB,
  HALF_BACK_IFB,
  HALF_BACK_IWB,
  TWO_HALF_BACKS,
  ADVANCED_CB_IFB,
  OCB_WCB,
  DROPPING_DMS,
  R01,
  AWB_TRIO,
  R02,
  WINGER_WING_BACK,
  OCB_WING_BACK,
  OCB_ADVANCED_WING_BACK,
  OCB_WINGER,
  OCB_ALONE,
  WINGER_ADVANCED_WING_BACK,
];
