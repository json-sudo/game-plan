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
export const SIDE_COLUMN_LABEL = 'Zone map and visualization controls';
export const ARROWS_LABEL = 'Arrows';
export const ARROWS_ALL_LABEL = 'All players';
export const ARROWS_SELECTED_LABEL = 'Selected only';

export const SETUP_STEP_FORMATIONS = 'Formations';
export const SETUP_STEP_WHO_ATTACKS = 'Who attacks';
export const SETUP_ROLES = 'Roles';
export const SETUP_ROLES_HINT =
  'Every player starts on their FM26 default role. Pick a player to change it.';
export const SETUP_ROLES_PHONE_HINT =
  'Every player starts on their FM26 default role. Change roles on a desktop.';
export const SETUP_ATTACKS_HINT =
  'The attacking team plays up the pitch. Changing it turns the pitch.';
export const SETUP_ROLES_RECOMPUTE_NOTE =
  'Changing a role recomputes the visualization and restarts it.';
export const SETUP_OPPONENT_LABEL = 'Opponent (optional)';
export const NO_OPPONENT_LABEL = 'No opponent';
export const NO_OPPONENT_SUMMARY = 'no opponent';
export const FORMATION_MORE_LABEL = 'More';
export const SETUP_FORMATION_NEXT_REASON = 'Pick a formation for your team first.';
export const setupAttacksSummary = (name: string) => `${name} attacks`;
export const setupRolesSummary = (count: number, changed: number) =>
  [`${count} ${count === 1 ? 'role' : 'roles'} set`, changed > 0 ? `${changed} changed` : null]
    .filter(Boolean)
    .join(' · ');
export const ROLE_CHANGED_TOOLTIP = 'Changed from the FM26 default';
export const ROLE_LIST_HEADINGS = {
  in: 'In possession roles',
  out: 'Out of possession roles',
} as const;
export const ROLE_LIST_TEAM_LABEL = 'Team';

export const KEEPER_LABEL = 'GK';
export const BALL_LABEL = 'Ball';
export const TOKEN_TEAM_LABELS = { mine: 'my team', opponent: 'opponent' } as const;
export const tokenSideLabel = (side: 'left' | 'right') => `${side} side`;

export const ATTACKING_TAG = 'Attacking ↑';
export const DEFENDING_TAG = 'Defending';
export const OPEN_PITCH_HINT = 'Places both teams attack against defence, with space between them.';
export const MATCHUP_HEADING = 'Matchup';
export const MATCHUP_APPLY_LABEL = 'Apply matchup';
export const MATCHUP_CLOSE_LABEL = 'Close matchup';
export const MATCHUP_BUTTON_LABEL = 'Matchup';
export const BENCH_BUTTON_LABEL = (count: number) => `Bench (${count})`;
export const BALL_CARD_LABEL = 'Ball';
export const BALL_CARD_CENTRE_SPOT = 'Centre spot';
export const BALL_CARD_HINT = 'Drag the ball anywhere on the pitch.';
export const BALL_TO_CENTRE_LABEL = 'Ball to the centre spot';
export const BALL_AT_CENTRE_REASON = 'The ball is on the centre spot.';
export const BALL_TOOLTIP = 'Ball. Drag it anywhere on the pitch.';
export const TOKEN_TOOLTIP = (position: string, role: string) => `${position} · ${role}`;
export const PITCH_EMPTY_SETUP =
  'Finish setting up your preferences to see your tactic visualization';
export const PITCH_EMPTY_ZONE = 'Pick a zone to finish setting up your tactic visualization';

export const ZONE_MAP_HEADING = 'Ball zone';
export const NO_ZONE_TITLE = 'No zone yet';
export const NO_ZONE_HINT = 'Tap a zone to put the ball there.';
export const ZONE_UNFINISHED_SUFFIX = ', setup not finished';
export const ZONE_UNFINISHED_MESSAGE = 'Finish setting up your tactic to see the runs.';
export const CARRIER_PICKED_SUFFIX = '(you picked)';
export const carrierLine = (carrier: string) => `On the ball: ${carrier}`;
export const ZONE_LOCKED_HINT = 'Finish setting up your tactic to pick a zone.';
export const ZONE_AFTER_HINT = 'Tap another zone to see a new visualization.';

export const RESET_FM_REASON = 'Pick a zone and start a visualization first.';
export const CLEAR_FM_REASON = 'Clear is for Open pitch. Use Reset in FM mode.';
export const EXPORT_PNG_LABEL = 'Export PNG';
export const EXPORT_FM_TOOLTIP = 'Export PNG of this frame';
export const SHARE_LABEL = 'Share tactic';
export const SHARE_FM_TOOLTIP = 'Saves the zone and visualization';

export const SHARE_LINK_LABEL = 'Link';
export const SHARE_COPIED = 'Link copied';
export const SHARE_HINT = 'Paste it in your group chat.';
export const SHARE_DONE_LABEL = 'Done';
export const EXPORT_NOTE = '1080 × 1350 PNG. Reads at group-chat size.';
export const EXPORT_CANCEL_LABEL = 'Cancel';
export const EXPORT_DOWNLOAD_LABEL = 'Download PNG';
export const EXPORT_PREVIEW_LABEL = 'Preview of the exported image';
export const EXPORT_FOOTER = 'Game Plan';
export const EXPORT_FILE_NAME = 'game-plan.png';

export const BENCH_HEADING = 'Bench';
export const benchCount = (placed: number, benched: number) =>
  `${placed} on pitch · ${benched} on bench`;
export const BENCH_CHIP_HINT = 'Drag onto the pitch, or press Enter to place.';
export const BENCH_DROP_LABEL = 'Drop here to bench';
export const BENCH_EMPTY_TITLE = 'Bench is empty';
export const BENCH_EMPTY_HINT = 'Drag a player off the pitch to bench them.';
export const BENCH_MENU_LABEL = 'Bench';
export const BENCH_CLOSE_LABEL = 'Close bench';
export const squadSizeLabel = (team: string) => `${team} squad size`;
export const keeperToggleLabel = (team: string) => `${team} keeper`;
export const SQUAD_SIZE_BLOCKED_REASON =
  'Bench some players first - a smaller squad cannot move players off the pitch.';

export const ROLE_PHASE_LABELS = { IP: 'In possession', OOP: 'Out of possession' } as const;
export const roleCount = (count: number) => `${count} ${count === 1 ? 'role' : 'roles'}`;
export const ROLE_CURRENT_MARK = 'Current';
export const ROLE_PICKER_CLOSE_LABEL = 'Close role picker';
export const ROLE_HOLDS_POSITION = 'Holds position';

export const VISUALIZATION_RESTART_LABEL = 'Restart';
export const VISUALIZATION_ANOTHER_LABEL = 'Show another visualization';
export const VISUALIZATION_SETUP_FIRST_REASON = 'Finish setting up your tactic first.';
export const VISUALIZATION_ZONE_FIRST_REASON = 'Pick a zone first.';
export const VISUALIZATION_SINGLE_REASON = 'This zone has one visualization.';
export const startsWithLine = (starter: string) => `Starts with ${starter}`;

export const DRIBBLE_LABELS = {
  up: 'Dribble forward',
  right: 'Dribble right',
  down: 'Dribble back',
  left: 'Dribble left',
} as const;

export const COPY_FM_POSITIONS_LABEL = 'Copy FM positions';
export const COPY_FM_POSITIONS_CONFIRMATION =
  'This will replace any pieces currently placed on the Open pitch.';

export const STORAGE_UNAVAILABLE_TITLE = 'Saving is off in this browser.';
export const STORAGE_UNAVAILABLE_BODY =
  'Storage is unavailable, so tactics cannot be saved here. Share a link instead.';
export const SAVED_TACTICS_UNREADABLE_TITLE = 'Saved tactics were skipped.';
export const SAVED_TACTICS_UNREADABLE_BODY = 'They could not be read.';

export const CARRIER_PICKER_HEADING = 'Who has the ball?';
export const CARRIER_PICKER_PROMPT = 'Pick who has the ball to see the shape.';
export const CARRIER_PICKER_EMPTY =
  'No player in this formation can have the ball here. Pick another zone.';
export const carrierPickerZoneLine = (zone: string) => `Eligible in: ${zone}`;
export const carrierOptionLabel = (position: string, role: string) => `${position} - ${role}`;

export const PASS_HEADING = 'Pass';
export const PASS_LABEL = 'Pass';
export const PASS_TO_LABEL = 'Pass to';
export const PASS_PLACEHOLDER = 'Choose a teammate';
export const PASS_CHOOSE_FIRST_REASON = 'Choose who to pass to first.';
export const PASS_NO_CARRIER_REASON = 'Pick who has the ball first.';
