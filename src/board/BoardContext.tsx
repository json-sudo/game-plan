import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import type { BoardState } from './types';
import { boardReducer, createInitialBoard, type BoardAction } from './boardReducer';

const BoardStateContext = createContext<BoardState | null>(null);
const BoardDispatchContext = createContext<Dispatch<BoardAction> | null>(null);

export function BoardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(boardReducer, undefined, createInitialBoard);
  return (
    <BoardStateContext.Provider value={state}>
      <BoardDispatchContext.Provider value={dispatch}>{children}</BoardDispatchContext.Provider>
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
