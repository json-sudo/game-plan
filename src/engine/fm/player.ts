import type { Point, Side } from '../../data/types';

export interface FmPlayer {
  id: string;
  team: Side;
  base: Point;
  roleId?: string;
  isKeeper: boolean;
}
