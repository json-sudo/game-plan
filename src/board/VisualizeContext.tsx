import { useState, type ReactNode } from 'react';
import type { Team } from './types';
import type { VisualizeAction } from './visualizeActions';
import {
  INITIAL_STATE,
  VisualizeContext,
  type DribbleDirection,
  type VisualizeState,
} from './useVisualize';

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
