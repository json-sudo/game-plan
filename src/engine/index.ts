export { isTransitionDone, positionAt, positionsAt, progressAt, transitionAt } from './anim/interpolate';
export { MOTION_DURATIONS_MS, MOTION_EASING, motionDurationMs } from './anim/motion';
export { nearestCarrier, nearestCarrierInLane, resolveCarrier } from './fm/carrier';
export type { CarrierCandidate } from './fm/carrier';
export { lineShift } from './fm/lineShift';
export { PITCH_TARGET_MARGIN, ballSideOf, offsetFor, targetFor } from './fm/movement';
export type { BallSide, MovementTables, TargetInput } from './fm/movement';
export { PHASES, PHASE_PROGRESS, computePhases } from './fm/phases';
export type { Phase, PhaseInput, PhasePlayer, PhaseResult, PhaseStatus, PhasePositions } from './fm/phases';
export { DRIBBLE_STEP, dragBall, dribble, pass, setCarrier, tapZone } from './fm/scenario';
export type { BallState, DribbleDirection, ScenarioContext } from './fm/scenario';
export {
  ZONE_GRID,
  fromAttackerFrame,
  laneOf,
  laneSignOf,
  toAttackerFrame,
  zoneBounds,
  zoneCentre,
  zoneName,
  zoneOf,
  thirdOf,
} from './fm/zones';
export type { ZoneBounds, ZoneGrid } from './fm/zones';
export { PITCH_H, PITCH_W, ballAtopPosition, clampToPitch } from './geometry/pitch';
export {
  MATCHUP_FRONT_MARGIN,
  MATCHUP_MAX_ADVANCE,
  layoutFormation,
  layoutMatchup,
  mirrorPoint,
} from './layout/formations';
export type { TeamLayout } from './layout/formations';
export { MIN_TOKEN_SPACING, enforceSpacing, minSpacingOf } from './layout/spacing';
export { computeZoneShape, zoneShapeShift } from './fm/shape';
