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
import { loadBoardsWrapper, pickAutoLoadSlot } from './persistence';
import { decodeShareHash, looksLikeShareHash } from './shareCodec';

export const FORMATION_ANIMATION_MS = 400;

const BoardStateContext = createContext<BoardState | null>(null);
const BoardDispatchContext = createContext<Dispatch<BoardAction> | null>(null);
const BoardAnimatingContext = createContext(false);
const ShareLinkErrorContext = createContext<[boolean, () => void]>([false, () => {}]);

/** The normal boot path — most-recent saved slot if one exists, else a fresh board. */
function normalBootBoard(): BoardState {
  const result = loadBoardsWrapper();
  if (result.status === 'ok') {
    const slot = pickAutoLoadSlot(result.wrapper);
    if (slot) return slot.board;
  }
  return createInitialBoard();
}

/**
 * A valid share hash in the URL wins over the saved-slot auto-load; a malformed one
 * shows an inline error and falls back to the normal boot path. No hash at all (or a
 * hash that isn't attempting to be a share link) also uses the normal boot path,
 * silently.
 */
function computeBootState(): { board: BoardState; shareLinkError: boolean } {
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  if (!looksLikeShareHash(hash)) {
    return { board: normalBootBoard(), shareLinkError: false };
  }
  const result = decodeShareHash(hash);
  if (result.status === 'ok') {
    return { board: result.board, shareLinkError: false };
  }
  return { board: normalBootBoard(), shareLinkError: true };
}

export function BoardProvider({ children }: { children: ReactNode }) {
  const [boot] = useState(computeBootState);
  const [state, dispatch] = useReducer(boardReducer, boot.board);
  const [shareLinkError, setShareLinkError] = useState(boot.shareLinkError);
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

  const dismissShareLinkError = useCallback(() => setShareLinkError(false), []);

  return (
    <BoardStateContext.Provider value={state}>
      <BoardDispatchContext.Provider value={dispatchWithAnimation}>
        <BoardAnimatingContext.Provider value={animating}>
          <ShareLinkErrorContext.Provider value={[shareLinkError, dismissShareLinkError]}>
            {children}
          </ShareLinkErrorContext.Provider>
        </BoardAnimatingContext.Provider>
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

/** `[hasError, dismiss]` for the "this share link couldn't be opened" boot-time banner. */
export function useShareLinkError(): [boolean, () => void] {
  return useContext(ShareLinkErrorContext);
}
