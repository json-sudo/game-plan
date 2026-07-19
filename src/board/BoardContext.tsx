import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react';
import type { BoardState } from './types';
import { boardReducer, createInitialBoard, type BoardAction } from './boardReducer';

export const FORMATION_ANIMATION_MS = 400;

const BoardStateContext = createContext<BoardState | null>(null);
const BoardDispatchContext = createContext<Dispatch<BoardAction> | null>(null);
const BoardAnimatingContext = createContext(false);

export function BoardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(boardReducer, undefined, createInitialBoard);
  const [animating, setAnimating] = useState(false);
  const timeoutRef = useRef<number | undefined>(undefined);

  const dispatchWithAnimation = useCallback((action: BoardAction) => {
    if (action.type === 'APPLY_FORMATION' || action.type === 'APPLY_MATCHUP') {
      setAnimating(true);
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setAnimating(false), FORMATION_ANIMATION_MS);
    }
    dispatch(action);
  }, []);

  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  return (
    <BoardStateContext.Provider value={state}>
      <BoardDispatchContext.Provider value={dispatchWithAnimation}>
        <BoardAnimatingContext.Provider value={animating}>{children}</BoardAnimatingContext.Provider>
      </BoardDispatchContext.Provider>
    </BoardStateContext.Provider>
  );
}

export function useBoard(): BoardState {
  const state = useContext(BoardStateContext);
  if (!state) throw new Error('useBoard must be used within BoardProvider');
  return state;
}

export function useBoardDispatch(): Dispatch<BoardAction> {
  const dispatch = useContext(BoardDispatchContext);
  if (!dispatch) throw new Error('useBoardDispatch must be used within BoardProvider');
  return dispatch;
}

export function useBoardAnimating(): boolean {
  return useContext(BoardAnimatingContext);
}
