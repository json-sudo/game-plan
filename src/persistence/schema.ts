import { z } from 'zod';
import { familySchema, pointSchema, slotIdSchema, zoneIdSchema } from '../data/schemas';
import {
  PIECE_NAME_MAX_LENGTH,
  TEAM_NAME_MAX_LENGTH,
  type Mode,
  type PitchDocument,
  type Tactic,
} from '../state';

export const TACTICS_STORAGE_KEY = 'gameplan:tactics';
export const CURRENT_TACTICS_VERSION = 4;
export const MAX_TACTICS_STORAGE_CHARS = 262144;
export const MAX_SLOTS = 2;
export const SLOT_NAME_MAX_LENGTH = 24;

const sideSchema = z.enum(['mine', 'opponent']);

const playerSchema = z.object({
  id: z.string().min(1).max(64),
  team: sideSchema,
  family: familySchema.nullable(),
  slot: slotIdSchema.nullable(),
  customName: z.string().min(1).max(PIECE_NAME_MAX_LENGTH).optional(),
  isKeeper: z.boolean(),
  role: z.string().min(1).max(64).optional(),
  base: pointSchema.optional(),
});

const teamSchema = z.object({
  name: z.string().min(1).max(TEAM_NAME_MAX_LENGTH),
  formationId: z.string().min(1).max(64).nullable(),
  squadSize: z.union([z.literal(11), z.literal(20), z.literal(26)]),
  keeper: z.boolean(),
  applied: z.enum(['formation', 'matchup']).nullable(),
});

export const documentSchema = z.object({
  attacker: sideSchema,
  teams: z.object({ mine: teamSchema, opponent: teamSchema }),
  players: z.array(playerSchema).max(54),
  ball: pointSchema,
  scenario: z.object({ zone: zoneIdSchema, carrierId: z.string().min(1).max(64) }).nullable(),
}) satisfies z.ZodType<PitchDocument>;

export const modeSchema = z.enum(['openPitch', 'fm']);

export const tacticSchema = z.object({
  openPitch: documentSchema,
  fm: documentSchema,
}) satisfies z.ZodType<Tactic>;

export const savedSlotSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().max(SLOT_NAME_MAX_LENGTH),
  savedAt: z.number().finite(),
  mode: modeSchema,
  tactic: tacticSchema,
}) satisfies z.ZodType<SavedSlot>;

export const wrapperHeadSchema = z.object({
  version: z.number().int().min(1),
  slots: z.array(z.unknown()),
});

export interface SavedSlot {
  id: string;
  name: string;
  savedAt: number;
  mode: Mode;
  tactic: Tactic;
}

export interface TacticsWrapper {
  version: number;
  slots: SavedSlot[];
}
