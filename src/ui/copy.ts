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

export const NEXT_AT_FINAL_HINT = 'Already at Final position. Press Play to start again.';
export const OPEN_PITCH_HINT =
  'Places both teams attack against defence, with space between them.';
