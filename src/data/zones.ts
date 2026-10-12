export const GRID = {
  lanes: ['L', 'LH', 'C', 'RH', 'R'],
  thirds: ['D', 'M', 'F'],
} as const;

const REAL_PITCH_WIDTH_M = 68;
const PENALTY_BOX_WIDTH_M = 40.32;
const SIX_YARD_BOX_WIDTH_M = 18.32;

const edgeFraction = (boxWidth: number) => (REAL_PITCH_WIDTH_M - boxWidth) / 2 / REAL_PITCH_WIDTH_M;

export const LANE_EDGE_FRACTIONS: readonly number[] = [
  edgeFraction(PENALTY_BOX_WIDTH_M),
  edgeFraction(SIX_YARD_BOX_WIDTH_M),
  1 - edgeFraction(SIX_YARD_BOX_WIDTH_M),
  1 - edgeFraction(PENALTY_BOX_WIDTH_M),
];

export type Lane = (typeof GRID.lanes)[number];
export type Third = (typeof GRID.thirds)[number];
export type ZoneId = `${Lane}-${Third}`;

export const ZONE_IDS: readonly ZoneId[] = GRID.lanes.flatMap((lane) =>
  GRID.thirds.map((third): ZoneId => `${lane}-${third}`),
);
