import type { BoardState, Team } from './types';
import { PITCH_H } from '../components/Pitch';

export type VisualizeAction = 'pass' | 'dribble' | 'shoot' | 'clear';

export const ATTACKING_THIRD_DEPTH = PITCH_H / 3;

export const PRESSURE_RADIUS = 15;

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function getAvailableActions(
  board: BoardState,
  attacker: Team,
  carrierId: string,
): VisualizeAction[] {
  const carrier = board.pieces.find((p) => p.id === carrierId);
  if (!carrier?.position) return [];

  const actions: VisualizeAction[] = ['dribble'];

  const teammates = board.pieces.filter(
    (p) => p.team === attacker && p.type === 'player' && p.id !== carrierId && p.position,
  );
  if (teammates.length > 0) actions.push('pass');

  const inAttackingThird =
    attacker === 'mine'
      ? carrier.position.y < ATTACKING_THIRD_DEPTH
      : carrier.position.y > PITCH_H - ATTACKING_THIRD_DEPTH;
  const nearOwnGoal =
    attacker === 'mine'
      ? carrier.position.y > PITCH_H - ATTACKING_THIRD_DEPTH
      : carrier.position.y < ATTACKING_THIRD_DEPTH;

  if (inAttackingThird) {
    actions.push('shoot');
  } else if (nearOwnGoal) {
    const opponents = board.pieces.filter(
      (p) => p.team !== attacker && p.type === 'player' && p.position,
    );
    const underPressure = opponents.some(
      (p) => distance(carrier.position!, p.position!) <= PRESSURE_RADIUS,
    );
    if (underPressure) actions.push('clear');
  }

  return actions;
}
