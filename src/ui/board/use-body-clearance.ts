import { useEffect } from 'react';
import type { StoreApi } from 'zustand';
import type { PitchStore } from '../../state/store';
import { bodyClearance, type BoardMetrics } from './board-metrics';

export function useBodyClearance(store: StoreApi<PitchStore>, metrics: BoardMetrics): void {
  const clearance = bodyClearance(metrics);
  useEffect(() => {
    const { ui, patchUi } = store.getState();
    if (ui.bodyClearance !== clearance) patchUi({ bodyClearance: clearance });
  }, [store, clearance]);
}
