import type { MovementTable } from '../types';
import { MOVEMENT_IN } from './movement-in';
import { MOVEMENT_OUT } from './movement-out';

export const MOVEMENT: MovementTable = { ...MOVEMENT_IN, ...MOVEMENT_OUT };
