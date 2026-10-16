export const PITCH_LABEL = 'Pitch';
export const RESET_LABEL = 'Reset';
export const CLEAR_LABEL = 'Clear';
export const THEME_LIGHT_LABEL = 'Light theme';
export const THEME_DARK_LABEL = 'Dark theme';
export const RESET_DISABLED_REASON = 'Apply a formation or matchup first.';
export const UNDO_DISABLED_REASON = 'Nothing to undo yet.';
export const REDO_DISABLED_REASON = 'Nothing to redo.';

export const MODE_LABELS = {
  open: 'Open pitch',
  fm: 'FM mode',
} as const;

export type PitchMode = keyof typeof MODE_LABELS;

export const MODE_OPTIONS = (Object.keys(MODE_LABELS) as PitchMode[]).map((value) => ({
  value,
  label: MODE_LABELS[value],
}));

export const VERSUS_LABEL = 'v';
export const SETUP_COLUMN_LABEL = 'Setup and arrows';
export const SIDE_COLUMN_LABEL = 'Zone map and transport';
export const ARROWS_LABEL = 'Arrows';
export const ARROWS_ALL_LABEL = 'All players';
export const ARROWS_SELECTED_LABEL = 'Selected only';

export const SETUP_STEP_FORMATIONS = 'Formations';
export const SETUP_STEP_WHO_ATTACKS = 'Who attacks';
export const SETUP_ROLES = 'Roles';
export const SETUP_ROLES_HINT =
  'Every player has an FM26 default role. Tap a player on the pitch to change it.';
export const SETUP_ROLES_PHONE_HINT =
  'Every player has an FM26 default role. Change a role with its menu below.';
export const setupAttacksSummary = (name: string) => `${name} attacks`;
export const setupRolesSummary = (count: number) =>
  `${count} ${count === 1 ? 'role' : 'roles'} set`;
export const setupRoleChoiceLabel = (slot: string, side: string) => `${slot} role, ${side}`;

export const KEEPER_LABEL = 'GK';
export const BALL_LABEL = 'Ball';
export const TOKEN_TEAM_LABELS = { mine: 'my team', opponent: 'opponent' } as const;
export const tokenSideLabel = (side: 'left' | 'right') => `${side} side`;

export const NEXT_AT_FINAL_HINT = 'Already at Final position. Press Play to start again.';
export const ATTACKING_TAG = 'Attacking ↑';
export const DEFENDING_TAG = 'Defending';
export const OPEN_PITCH_HINT = 'Places both teams attack against defence, with space between them.';

export const ZONE_MAP_HEADING = 'Ball zone';
export const NO_ZONE_TITLE = 'No zone yet';
export const NO_ZONE_HINT = 'Tap a zone to put the ball there.';
export const ZONE_UNFINISHED_SUFFIX = ', setup not finished';
export const ZONE_UNFINISHED_MESSAGE = 'Finish setting up your tactic to see the runs.';
export const CARRIER_PICKED_SUFFIX = '(you picked)';
export const carrierLine = (carrier: string) => `On the ball: ${carrier}`;
export const ZONE_PRESETS = [
  { label: 'Attack down the left', zone: 'L-F' },
  { label: 'Attack down the right', zone: 'R-F' },
] as const;

export const BENCH_HEADING = 'Bench';
export const benchCount = (placed: number, benched: number) =>
  `${placed} on pitch · ${benched} on bench`;
export const BENCH_DROP_LABEL = 'Drop here to bench';
export const BENCH_EMPTY_TITLE = 'Bench is empty';
export const BENCH_EMPTY_HINT = 'Drag a player off the pitch to bench them.';
export const BENCH_MENU_LABEL = 'Bench';
export const BENCH_CLOSE_LABEL = 'Close bench';
export const SQUAD_SIZE_LABEL = 'Squad size';
export const KEEPER_TOGGLE_LABEL = 'Keeper';

export const ROLE_PHASE_LABELS = { IP: 'In possession', OOP: 'Out of possession' } as const;
export const roleCount = (count: number) => `${count} ${count === 1 ? 'role' : 'roles'}`;
export const ROLE_CURRENT_MARK = 'Current';
export const ROLE_PICKER_CLOSE_LABEL = 'Close role picker';
export const ROLE_HOLDS_POSITION = 'Holds position';

export const TRANSPORT_PHASE_LABELS = ['Shape', 'Runs', 'Final'] as const;
export const BACK_AT_SHAPE_HINT = 'Already at Shape.';
export const TRANSPORT_BACK_LABEL = 'Back';
export const TRANSPORT_NEXT_LABEL = 'Next';
export const TRANSPORT_PLAY_LABEL = 'Play';
export const TRANSPORT_PAUSE_LABEL = 'Pause';
export const TRANSPORT_PLAYING_STATUS = 'Playing';
export const transportStatus = (phase: number) =>
  `${phase + 1} of ${TRANSPORT_PHASE_LABELS.length}`;

export const DRIBBLE_LABELS = {
  up: 'Dribble forward',
  right: 'Dribble right',
  down: 'Dribble back',
  left: 'Dribble left',
} as const;
