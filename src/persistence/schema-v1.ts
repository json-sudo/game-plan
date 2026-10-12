import { z } from 'zod';
import { pointSchema } from '../data/schemas';

const pieceV1Schema = z.object({
  id: z.string().min(1),
  type: z.enum(['player', 'ball']),
  team: z.enum(['mine', 'opponent']),
  label: z.string(),
  name: z.string().optional(),
  position: pointSchema.optional(),
  isKeeper: z.boolean().optional(),
});

const squadSizeV1Schema = z.union([z.literal(11), z.literal(20), z.literal(26)]);

const boardV1Schema = z.object({
  pieces: z.array(pieceV1Schema).max(60),
  squad: z.object({ mine: squadSizeV1Schema, opponent: squadSizeV1Schema }),
  keeper: z.object({ mine: z.boolean(), opponent: z.boolean() }),
});

export type BoardV1 = z.infer<typeof boardV1Schema>;
export type PieceV1 = z.infer<typeof pieceV1Schema>;

export const savedSlotV1Schema = z.object({
  id: z.string().min(1),
  name: z.string(),
  savedAt: z.number().finite(),
  board: boardV1Schema,
});
