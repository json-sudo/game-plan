import { createContext, useContext, type Dispatch } from 'react';
import type { BoardState } from './types';
import type { BoardAction } from './boardReducer';

export const BoardStateContext = createContext<BoardState | null>(null);
export const BoardDispatchContext = createContext<Dispatch<BoardAction> | null>(null);
export const BoardAnimatingContext = createContext(false);
export const BoardAnimatingDurationContext = createContext<number | null>(null);
export const ShareLinkErrorContext = createContext<[boolean, () => void]>([false, () => {}]);

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

export function useBoardAnimatingDuration(): number | null {
  return useContext(BoardAnimatingDurationContext);
}

export function useShareLinkError(): [boolean, () => void] {
  return useContext(ShareLinkErrorContext);
}
