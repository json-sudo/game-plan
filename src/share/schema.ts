import { z } from 'zod';
import { FAMILIES } from '../data/types';
import { slotIdSchema, zoneIdSchema } from '../data/schemas';
import { PIECE_NAME_MAX_LENGTH, TEAM_NAME_MAX_LENGTH } from '../state';

const flag = z.union([z.literal(0), z.literal(1)]);
const int = z.number().int();
const teamName = z.string().min(1).max(TEAM_NAME_MAX_LENGTH);
const formationId = z.union([z.literal(0), z.string().min(1).max(64)]);
const squadSize = z.union([z.literal(11), z.literal(20), z.literal(26)]);
const applied = z.union([z.literal(0), z.literal(1), z.literal(2)]);

const playerTuple = z.tuple([
  z.string().min(1).max(64),
  flag,
  int.min(0).max(FAMILIES.length),
  z.union([z.literal(0), slotIdSchema]),
  int.nullable(),
  int.nullable(),
  z.union([z.literal(0), z.string().min(1).max(8)]),
  z.union([z.literal(0), z.string().min(1).max(PIECE_NAME_MAX_LENGTH)]),
]);

const layoutTuple = z.tuple([
  flag,
  z.tuple([formationId, formationId]),
  z.tuple([flag, flag]),
  z.tuple([applied, applied]),
  z.array(playerTuple).max(54),
  z.tuple([int, int]),
  z.union([z.literal(0), zoneIdSchema]),
  int.min(0),
]);

export const sharePayloadSchema = z.tuple([
  z.string().min(1).max(32),
  flag,
  z.tuple([teamName, teamName]),
  z.tuple([squadSize, squadSize]),
  layoutTuple,
  layoutTuple,
]);

export type SharePayload = z.infer<typeof sharePayloadSchema>;
export type ShareLayoutTuple = SharePayload[4];
export type SharePlayerTuple = ShareLayoutTuple[4][number];
