import { createStore, type StoreApi } from 'zustand/vanilla';
import type { DribbleDirection, Phase } from '../engine';
import type { Point } from '../data/types';
import { applyAction, type Action } from './actions';
import { selectDisplayPositions } from './selectors';
import type { PitchDocument } from './document';
import { commit, emptyHistory, redo, undo, type History } from './history';
import { copyFmPositions, applyTacticAction } from './tactic-actions';
import { tacticIssues } from './tactic-validate';
import {
  createInitialTactic,
  tacticFromDocument,
  type Mode,
  type Tactic,
  type TacticSnapshot,
} from './tactic';
import { FM26_DATA } from '../data/fm26';

export type { Mode } from './tactic';
export type ArrowMode = 'all' | 'selected';
export type Theme = 'light' | 'dark';
export type DragTarget = { kind: 'player'; id: string } | { kind: 'ball' };

export interface DragState {
  target: DragTarget;
  point: Point;
}

export type BallAction =
  { type: 'pass'; receiverId: string } | { type: 'dribble'; direction: DribbleDirection };

export interface UiState {
  mode: Mode;
  phase: Phase;
  playing: boolean;
  selectedPlayerId: string | null;
  arrows: ArrowMode;
  setupStep: 1 | 2 | 3 | null;
  theme: Theme;
  drag: DragState | null;
  action: BallAction | null;
}

export interface LoadTacticOptions {
  mode: Mode;
  phase?: Phase;
}

export interface PitchStore {
  tactic: Tactic;
  doc: PitchDocument;
  history: History<TacticSnapshot>;
  ui: UiState;
  dispatch: (action: Action) => void;
  copyFmPositions: () => void;
  loadTactic: (tactic: Tactic, options: LoadTacticOptions) => boolean;
  undo: () => void;
  redo: () => void;
  patchUi: (patch: Partial<UiState>) => void;
  setMode: (mode: Mode) => void;
  beginDrag: (target: DragTarget, point: Point) => void;
  updateDrag: (point: Point) => void;
  endDrag: () => void;
  cancelDrag: () => void;
  startAction: (action: BallAction) => void;
  commitAction: () => void;
  cancelAction: () => void;
}

export interface PitchStoreOptions {
  tactic?: Tactic;
  doc?: PitchDocument;
  ui?: Partial<UiState>;
}

export function initialUi(mode: Mode): UiState {
  return {
    mode,
    phase: 'shape',
    playing: false,
    selectedPlayerId: null,
    arrows: 'selected',
    setupStep: null,
    theme: 'light',
    drag: null,
    action: null,
  };
}

function actionToDispatch(action: BallAction, positions: ReadonlyMap<string, Point>): Action {
  return action.type === 'pass'
    ? { type: 'pass', receiverId: action.receiverId, positions }
    : { type: 'dribble', direction: action.direction };
}

function dragAction(drag: DragState): Action {
  return drag.target.kind === 'ball'
    ? { type: 'placeBall', point: drag.point }
    : { type: 'movePlayer', playerId: drag.target.id, point: drag.point };
}

function initialTactic(options: PitchStoreOptions, mode: Mode): Tactic {
  if (options.tactic) return options.tactic;
  return options.doc ? tacticFromDocument(options.doc, mode) : createInitialTactic();
}

export function createPitchStore(options: PitchStoreOptions = {}): StoreApi<PitchStore> {
  const initialUiState: UiState = { ...initialUi('openPitch'), ...options.ui };
  const tactic = initialTactic(options, initialUiState.mode);
  return createStore<PitchStore>()((set, get) => {
    const snapshot = (): TacticSnapshot => ({ tactic: get().tactic, mode: get().ui.mode });
    const restore = (entry: TacticSnapshot, ui: UiState) =>
      ({
        tactic: entry.tactic,
        doc: entry.tactic[entry.mode],
        ui: { ...ui, mode: entry.mode, action: null },
      }) satisfies Partial<PitchStore>;
    const replaceTactic = (next: Tactic) => {
      const { tactic: current, history, ui } = get();
      if (next === current) return;
      set({
        tactic: next,
        doc: next[ui.mode],
        history: commit(history, snapshot()),
      });
    };
    const dispatch = (action: Action) => {
      const { tactic: current, ui } = get();
      replaceTactic(applyTacticAction(current, ui.mode, action));
    };
    return {
      tactic,
      doc: tactic[initialUiState.mode],
      history: emptyHistory<TacticSnapshot>(),
      ui: initialUiState,
      dispatch,
      copyFmPositions: () => replaceTactic(copyFmPositions(get().tactic)),
      loadTactic: (next, { mode, phase }) => {
        if (tacticIssues(next, FM26_DATA) !== null) return false;
        const { history, ui } = get();
        set({
          tactic: next,
          doc: next[mode],
          history: commit(history, snapshot()),
          ui: {
            ...ui,
            mode,
            phase: phase ?? 'shape',
            playing: false,
            selectedPlayerId: null,
            drag: null,
            action: null,
          },
        });
        return true;
      },
      undo: () => {
        const step = undo(get().history, snapshot());
        if (step) set({ ...restore(step.present, get().ui), history: step.history });
      },
      redo: () => {
        const step = redo(get().history, snapshot());
        if (step) set({ ...restore(step.present, get().ui), history: step.history });
      },
      patchUi: (patch) => {
        const ui = { ...get().ui, ...patch };
        set({ ui, doc: get().tactic[ui.mode] });
      },
      setMode: (mode) => {
        const { ui, tactic: current } = get();
        if (ui.mode === mode) return;
        set({ ui: { ...ui, mode, action: null }, doc: current[mode] });
      },
      beginDrag: (target, point) => {
        if (target.kind === 'ball' && get().ui.mode === 'fm') return;
        set({ ui: { ...get().ui, drag: { target, point } } });
      },
      updateDrag: (point) => {
        const { drag } = get().ui;
        if (drag) set({ ui: { ...get().ui, drag: { ...drag, point } } });
      },
      endDrag: () => {
        const { drag } = get().ui;
        if (!drag) return;
        set({ ui: { ...get().ui, drag: null } });
        dispatch(dragAction(drag));
      },
      cancelDrag: () => set({ ui: { ...get().ui, drag: null } }),
      startAction: (action) => {
        const { doc: current, ui: currentUi } = get();
        if (currentUi.mode !== 'fm' || currentUi.action || !current.scenario) return;
        const refused =
          applyAction(current, actionToDispatch(action, selectDisplayPositions(get()))) === current;
        if (!refused) set({ ui: { ...currentUi, action } });
      },
      commitAction: () => {
        const state = get();
        const { action } = state.ui;
        if (!action) return;
        set({ ui: { ...state.ui, action: null } });
        dispatch(actionToDispatch(action, selectDisplayPositions(state)));
      },
      cancelAction: () => {
        if (get().ui.action) set({ ui: { ...get().ui, action: null } });
      },
    };
  });
}
