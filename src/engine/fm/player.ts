import type { Family, Point, Side } from '../../data/types';

export interface FmPlayer {
  id: string;
  team: Side;
  family: Family;
  base: Point;
  roleId?: string;
  isKeeper: boolean;
}
