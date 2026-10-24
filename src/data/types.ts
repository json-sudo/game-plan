export type Side = 'mine' | 'opponent';
export type Possession = 'in' | 'out';

export interface Point {
  x: number;
  y: number;
}

export const FAMILIES = [
  'GK',
  'D(L)',
  'D(C)',
  'D(R)',
  'WB(L)',
  'WB(R)',
  'DM',
  'M(L)',
  'M(C)',
  'M(R)',
  'AM(L)',
  'AM(C)',
  'AM(R)',
  'ST',
] as const;

export type Family = (typeof FAMILIES)[number];

export const SLOT_IDS = [
  'GK',
  'DL',
  'DCL',
  'DC',
  'DCR',
  'DR',
  'WBL',
  'WBR',
  'DM',
  'DML',
  'DMR',
  'DMCL',
  'DMCR',
  'MCL',
  'MCR',
  'AML',
  'AMC',
  'AMCL',
  'AMCR',
  'AMR',
  'STL',
  'ST',
  'STR',
] as const;

export type SlotId = (typeof SLOT_IDS)[number];

export interface RoleDef {
  id: string;
  code: string;
  name: string;
  possession: Possession;
  families: readonly Family[];
  description: string;
}

export interface FormationSlot {
  id: SlotId;
  family: Family;
  base: Point;
}

export interface FormationDef {
  id: string;
  name: string;
  slots: readonly FormationSlot[];
}

export interface DataSet {
  version: string;
  roles: readonly RoleDef[];
  formations: readonly FormationDef[];
}
