export const GRID = {
  lanes: ['L', 'C', 'R'],
  thirds: ['D', 'M', 'F'],
} as const;

export type Lane = (typeof GRID.lanes)[number];
export type Third = (typeof GRID.thirds)[number];
export type ZoneId = `${Lane}-${Third}`;

export const ZONE_IDS: readonly ZoneId[] = GRID.lanes.flatMap((lane) =>
  GRID.thirds.map((third): ZoneId => `${lane}-${third}`),
);
