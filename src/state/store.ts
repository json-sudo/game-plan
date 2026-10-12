import { createStore, type StoreApi } from 'zustand/vanilla';
import type { Phase } from '../engine';
import type { Point } from '../data/types';
import { applyAction, type Action } from './actions';
import { createInitialDocument, type PitchDocument } from './document';
import { commit, emptyHistory, redo, undo, type History } from './history';

export type Mode = 'openPitch' | 'fm';
export type ArrowMode = 'all' | 'selected';
export type Theme = 'light' | 'dark';
export type DragTarget = { kind: 'player'; id: string } | { kind: 'ball' };

export interface DragState {
  target: DragTarget;
  point: Point;
}

export interface UiState {
  mode: Mode;
  phase: Phase;
  playing: boolean;
  selectedPlayerId: string | null;
  arrows: ArrowMode;
  setupStep: 1 | 2 | 3 | null;
  theme: Theme;
  drag: DragState | null;
}

export interface PitchStore {
  doc: PitchDocument;
  history: History<PitchDocument>;
  ui: UiState;
  dispatch: (action: Action) => void;
  undo: () => void;
  redo: () => void;
  patchUi: (patch: Partial<UiState>) => void;
  setMode: (mode: Mode) => void;
  beginDrag: (target: DragTarget, point: Point) => void;
  updateDrag: (point: Point) => void;
  endDrag: () => void;
  cancelDrag: () => void;
}

export interface PitchStoreOptions {
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
  };
}

function dragAction(drag: DragState): Action {
  return drag.target.kind === 'ball'
    ? { type: 'dragBall', point: drag.point }
    : { type: 'movePlayer', playerId: drag.target.id, point: drag.point };
}

export function createPitchStore(options: PitchStoreOptions = {}): StoreApi<PitchStore> {
  const { doc = createInitialDocument(), ui = {} } = options;
  return createStore<PitchStore>()((set, get) => {
    const dispatch = (action: Action) => {
      const { doc: current, history } = get();
      const next = applyAction(current, action);
      if (next === current) return;
      set({ doc: next, history: commit(history, current) });
    };
    return {
      doc,
      history: emptyHistory<PitchDocument>(),
      ui: { ...initialUi('openPitch'), ...ui },
      dispatch,
      undo: () => {
        const step = undo(get().history, get().doc);
        if (step) set({ doc: step.present, history: step.history });
      },
      redo: () => {
        const step = redo(get().history, get().doc);
        if (step) set({ doc: step.present, history: step.history });
      },
      patchUi: (patch) => set({ ui: { ...get().ui, ...patch } }),
      setMode: (mode) => {
        if (get().ui.mode === mode) return;
        const { doc: current, history, ui: currentUi } = get();
        const ui = { ...currentUi, mode };
        if (mode !== 'fm') return set({ ui });
        const fill = (entry: PitchDocument) => applyAction(entry, { type: 'fillDefaultRoles' });
        set({
          ui,
          doc: fill(current),
          history: { past: history.past.map(fill), future: history.future.map(fill) },
        });
      },
      beginDrag: (target, point) => set({ ui: { ...get().ui, drag: { target, point } } }),
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
    };
  });
}
