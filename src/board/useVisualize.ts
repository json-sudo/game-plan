import { createContext, useContext } from 'react';
import type { Team } from './types';
import type { VisualizeAction } from './visualizeActions';

export type DribbleDirection = 'forward' | 'left' | 'right' | 'back';

export interface VisualizeState {
  active: boolean;
  attacker: Team;
  carrierId: string | null;
  action: VisualizeAction | null;
  passTargetId: string | null;
  dribbleDirection: DribbleDirection | null;
}

export interface VisualizeApi extends VisualizeState {
  start: (attacker: Team) => void;
  stop: () => void;
  selectCarrier: (id: string) => void;
  selectAction: (action: VisualizeAction) => void;
  selectPassTarget: (id: string) => void;
  selectDribbleDirection: (direction: DribbleDirection) => void;
}

export const INITIAL_STATE: VisualizeState = {
  active: false,
  attacker: 'mine',
  carrierId: null,
  action: null,
  passTargetId: null,
  dribbleDirection: null,
};

export const VisualizeContext = createContext<VisualizeApi | null>(null);

const NOOP_API: VisualizeApi = {
  ...INITIAL_STATE,
  start: () => {},
  stop: () => {},
  selectCarrier: () => {},
  selectAction: () => {},
  selectPassTarget: () => {},
  selectDribbleDirection: () => {},
};

export function useVisualize(): VisualizeApi {
  const api = useContext(VisualizeContext);
  return api ?? NOOP_API;
}
