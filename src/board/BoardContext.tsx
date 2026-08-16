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

export const VISUALIZE_PRE_ANIMATION_DELAY_MS = 1200;
export const VISUALIZE_ANIMATION_MS = 4000;

const BoardStateContext = createContext<BoardState | null>(null);
const BoardDispatchContext = createContext<Dispatch<BoardAction> | null>(null);
const BoardAnimatingContext = createContext(false);
const BoardAnimatingDurationContext = createContext<number | null>(null);
const ShareLinkErrorContext = createContext<[boolean, () => void]>([false, () => {}]);

function normalBootBoard(): BoardState {
  const result = loadBoardsWrapper();
  if (result.status === 'ok') {
    const slot = pickAutoLoadSlot(result.wrapper);
    if (slot) return slot.board;
  }
  return createInitialBoard();
}

/** Drops the share hash from the URL without a navigation, so it stops outranking future state changes. */
function clearShareHashFromUrl() {
  if (typeof window === 'undefined') return;
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}

function computeBootState(): { board: BoardState; shareLinkError: boolean; hadShareHash: boolean } {
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  if (!looksLikeShareHash(hash)) {
    return { board: normalBootBoard(), shareLinkError: false, hadShareHash: false };
  }
  const result = decodeShareHash(hash);
  if (result.status === 'ok') {
    return { board: result.board, shareLinkError: false, hadShareHash: true };
  }
  return { board: normalBootBoard(), shareLinkError: true, hadShareHash: true };
}

export function BoardProvider({ children }: { children: ReactNode }) {
  const [boot] = useState(computeBootState);
  const [state, dispatch] = useReducer(boardReducer, boot.board);
  const [shareLinkError, setShareLinkError] = useState(boot.shareLinkError);
  const [animatingDuration, setAnimatingDuration] = useState<number | null>(null);
  const timeoutRef = useRef<number | undefined>(undefined);
  const visualizeDelayRef = useRef<number | undefined>(undefined);
  const visualizeBallHopRef = useRef<number | undefined>(undefined);

  const dispatchWithAnimation = useCallback((action: BoardAction) => {
    window.clearTimeout(timeoutRef.current);
    window.clearTimeout(visualizeDelayRef.current);
    window.clearTimeout(visualizeBallHopRef.current);

    if (
      action.type === 'APPLY_FORMATION' ||
      action.type === 'APPLY_MATCHUP' ||
      action.type === 'PLACE_VISUALIZE_BALL_HOP'
    ) {
      setAnimatingDuration(FORMATION_ANIMATION_MS);
      timeoutRef.current = window.setTimeout(() => setAnimatingDuration(null), FORMATION_ANIMATION_MS);
      dispatch(action);
      return;
    }
    if (action.type === 'APPLY_VISUALIZE_OUTCOME') {
      setAnimatingDuration(null);
      visualizeDelayRef.current = window.setTimeout(() => {
        dispatch(action);
        setAnimatingDuration(VISUALIZE_ANIMATION_MS);
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(
          () => setAnimatingDuration(null),
          VISUALIZE_ANIMATION_MS,
        );
      }, VISUALIZE_PRE_ANIMATION_DELAY_MS);
      return;
    }
    if (action.type === 'LOAD_BOARD') {
      clearShareHashFromUrl();
      dispatch(action);
      return;
    }
    dispatch(action);
  }, []);

  useEffect(() => {
    if (boot.hadShareHash) clearShareHashFromUrl();
  }, [boot.hadShareHash]);

  useEffect(
    () => () => {
      window.clearTimeout(timeoutRef.current);
      window.clearTimeout(visualizeDelayRef.current);
      window.clearTimeout(visualizeBallHopRef.current);
    },
    [],
  );

  const dismissShareLinkError = useCallback(() => setShareLinkError(false), []);

  return (
    <BoardStateContext.Provider value={state}>
      <BoardDispatchContext.Provider value={dispatchWithAnimation}>
        <BoardAnimatingContext.Provider value={animatingDuration !== null}>
          <BoardAnimatingDurationContext.Provider value={animatingDuration}>
            <ShareLinkErrorContext.Provider value={[shareLinkError, dismissShareLinkError]}>
              {children}
            </ShareLinkErrorContext.Provider>
          </BoardAnimatingDurationContext.Provider>
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

export function useBoardAnimatingDuration(): number | null {
  return useContext(BoardAnimatingDurationContext);
}

export function useShareLinkError(): [boolean, () => void] {
  return useContext(ShareLinkErrorContext);
}
