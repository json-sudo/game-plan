import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Team } from './types';
import type { VisualizeAction } from './visualizeActions';

export type DribbleDirection = 'forward' | 'left' | 'right' | 'back';

interface VisualizeState {
  active: boolean;
  attacker: Team;
  carrierId: string | null;
  action: VisualizeAction | null;
  passTargetId: string | null;
  dribbleDirection: DribbleDirection | null;
}

interface VisualizeApi extends VisualizeState {
  start: (attacker: Team) => void;
  stop: () => void;
  selectCarrier: (id: string) => void;
  selectAction: (action: VisualizeAction) => void;
  selectPassTarget: (id: string) => void;
  selectDribbleDirection: (direction: DribbleDirection) => void;
}

const INITIAL_STATE: VisualizeState = {
  active: false,
  attacker: 'mine',
  carrierId: null,
  action: null,
  passTargetId: null,
  dribbleDirection: null,
};

const VisualizeContext = createContext<VisualizeApi | null>(null);

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

export function VisualizeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<VisualizeState>(INITIAL_STATE);

  const start = (attacker: Team) => {
    setState({ ...INITIAL_STATE, active: true, attacker });
  };

  const stop = () => {
    setState(INITIAL_STATE);
  };

  const selectCarrier = (id: string) => {
    setState((s) => ({
      ...s,
      carrierId: id,
      action: null,
      passTargetId: null,
      dribbleDirection: null,
    }));
  };

  const selectAction = (action: VisualizeAction) => {
    setState((s) => {
      if (!s.carrierId) return s;
      return { ...s, action, passTargetId: null, dribbleDirection: null };
    });
  };

  const selectPassTarget = (id: string) => {
    setState((s) => ({ ...s, passTargetId: id }));
  };

  const selectDribbleDirection = (direction: DribbleDirection) => {
    setState((s) => ({ ...s, dribbleDirection: direction }));
  };

  return (
    <VisualizeContext.Provider
      value={{
        ...state,
        start,
        stop,
        selectCarrier,
        selectAction,
        selectPassTarget,
        selectDribbleDirection,
      }}
    >
      {children}
    </VisualizeContext.Provider>
  );
}
