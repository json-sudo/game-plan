import { z } from 'zod';
import { FAMILIES, SLOT_IDS } from './types';
import { ZONE_IDS } from './zones';

export const familySchema = z.enum(FAMILIES);
export const slotIdSchema = z.enum(SLOT_IDS);
export const zoneIdSchema = z.enum(ZONE_IDS);
const provenanceSchema = z.enum(['spike', 'initial']);
const offsetSchema = z.tuple([z.number(), z.number(), z.number()]);
export const pointSchema = z.object({ x: z.number(), y: z.number() });

export const roleSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(2).max(4),
  name: z.string().min(1),
  possession: z.enum(['in', 'out']),
  families: z.array(familySchema).min(1),
  description: z.string().min(1),
});

export const formationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slots: z.array(z.object({ id: slotIdSchema, family: familySchema, base: pointSchema })).min(1),
});

export const movementCellSchema = z.object({
  ball: offsetSchema,
  far: offsetSchema,
  from: z.object({ ball: provenanceSchema, far: provenanceSchema }),
});

export const movementTableSchema = z.record(
  z.string(),
  z.partialRecord(zoneIdSchema, movementCellSchema),
);

export const lineShiftSchema = z.record(
  zoneIdSchema,
  z.object({ dy: z.number(), from: provenanceSchema }),
);

export const dataSetSchema = z.object({
  version: z.string().min(1),
  roles: z.array(roleSchema),
  formations: z.array(formationSchema),
  movement: movementTableSchema,
  shapeLineShift: lineShiftSchema,
  lineShift: lineShiftSchema,
});
