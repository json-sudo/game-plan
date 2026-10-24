import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROLES } from './index';

const BASELINE_IN_POSSESSION_IDS: readonly string[] = [
  'deep_lying_forward_ip',
  'centre_forward_ip',
  'target_forward_ip',
  'poacher_ip',
  'channel_forward_ip',
  'false_nine_ip',
  'winger_ip',
  'inside_forward_ip',
  'playmaking_winger_ip',
  'wide_forward_ip',
  'inside_winger_ip',
  'attacking_midfielder_ip',
  'advanced_playmaker_ip',
  'free_role_ip',
  'second_striker_ip',
  'channel_midfielder_ip',
  'wide_midfielder_ip',
  'central_midfielder_ip',
  'wide_central_midfielder_ip',
  'midfield_playmaker_ip',
  'wing_back_ip',
  'advanced_wing_back_ip',
  'inside_wing_back_ip',
  'playmaking_wing_back_ip',
  'defensive_midfielder_ip',
  'deep_lying_playmaker_ip',
  'box_to_box_midfielder_ip',
  'half_back_ip',
  'box_to_box_playmaker_ip',
  'full_back_ip',
  'inside_full_back_ip',
  'playmaking_wing_back_ip_d_l_r',
  'centre_back_ip',
  'advanced_centre_back_ip',
  'ball_playing_centre_back_ip',
  'no_nonsense_center_back_ip',
  'no_nonsense_goalkeeper_ip',
  'ball_playing_goalkeeper_ip',
  'goalkeeper_ip',
  'wide_centre_back_ip',
];

const BASELINE_OUT_OF_POSSESSION_IDS: readonly string[] = [
  'centre_forward_oop',
  'tracking_centre_forward_oop',
  'central_outlet_centre_forward_oop',
  'winger_oop',
  'tracking_winger_oop',
  'inside_outlet_winger_oop',
  'wide_outlet_winger_oop',
  'splitting_outlet_centre_forward_oop',
  'tracking_attacking_midfielder_oop',
  'central_outlet_attacking_midfielder_oop',
  'splitting_outlet_attacking_midfielder_oop',
  'attacking_midfielder_oop',
  'wide_midfielder_oop',
  'tracking_wide_midfielder_oop',
  'wide_outlet_wide_midfielder_oop',
  'central_midfielder_oop',
  'pressing_central_midfielder_oop',
  'screening_central_midfielder_oop',
  'wide_covering_central_midfielder_oop',
  'wing_back_oop',
  'pressing_wing_back_oop',
  'holding_wing_back_oop',
  'defensive_midfielder_oop',
  'dropping_defensive_midfielder_oop',
  'screening_defensive_midfielder_oop',
  'wide_covering_defensive_midfielder_oop',
  'full_back_oop',
  'pressing_full_back_oop',
  'holding_full_back_oop',
  'centre_back_oop',
  'stopping_centre_back_oop',
  'covering_centre_back_oop',
  'goalkeeper_oop',
  'sweeper_keeper_oop',
  'line_holding_keeper_oop',
];

const ROOT = join(__dirname, '..', '..', '..');
const GENERATED_FILES = ['roles.ts', 'formations.ts'].map((name) => join(__dirname, name));

function codeFor(prefix: string, index: number) {
  return `${prefix}${String(index + 1).padStart(2, '0')}`;
}

describe('role inventory', () => {
  it('keeps the 75 existing ids and codes unchanged and adds only the Overlapping Centre-Back', () => {
    const baseline = [
      ...BASELINE_IN_POSSESSION_IDS.map((id, index) => [id, codeFor('i', index)]),
      ...BASELINE_OUT_OF_POSSESSION_IDS.map((id, index) => [id, codeFor('o', index)]),
    ];
    expect(baseline).toHaveLength(75);
    const actual = new Map(ROLES.map((role) => [role.id, role.code]));
    for (const [id, code] of baseline) expect(actual.get(id)).toBe(code);

    const baselineIds = new Set(baseline.map(([id]) => id));
    const added = ROLES.filter((role) => !baselineIds.has(role.id));
    expect(added.map((role) => [role.id, role.code, role.possession, role.families])).toEqual([
      ['overlapping_centre_back_ip', 'i41', 'in', ['D(C)']],
    ]);
    expect(ROLES).toHaveLength(76);
  });
});

describe('generator', () => {
  it('reproduces the committed generated data', () => {
    const read = () => GENERATED_FILES.map((path) => readFileSync(path, 'utf8'));
    const before = read();
    execFileSync('node', ['scripts/generate-fm26-data.mjs'], { cwd: ROOT, stdio: 'pipe' });
    expect(read()).toEqual(before);
  }, 60_000);
});
