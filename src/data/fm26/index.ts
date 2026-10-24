import type { DataSet } from '../types';
import { FORMATIONS } from './formations';
import { ROLES } from './roles';

export const DATA_VERSION = 'fm26-3';

export const FM26_DATA: DataSet = {
  version: DATA_VERSION,
  roles: ROLES,
  formations: FORMATIONS,
};

export { FORMATIONS, ROLES };
