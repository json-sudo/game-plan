import { computePhases, type PhaseInput, type PhaseResult } from './phases';

export type PositionEngine = (input: PhaseInput) => PhaseResult;

export const PROVISIONAL_POSITION_ENGINE: PositionEngine = computePhases;
