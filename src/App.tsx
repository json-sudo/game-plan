import { useState } from 'react';
import { createExampleDocument } from './state/example';
import { createPitchStore } from './state/store';
import { BoardDesktop } from './ui/board/BoardDesktop';
import { BoardPhone } from './ui/board/BoardPhone';
import { useBoardMetrics } from './ui/board/use-board-metrics';

export default function App() {
  const [store] = useState(() =>
    createPitchStore({ doc: createExampleDocument(), ui: { mode: 'fm' } }),
  );
  const metrics = useBoardMetrics();
  return metrics.layout === 'phone' ? <BoardPhone store={store} /> : <BoardDesktop store={store} />;
}
