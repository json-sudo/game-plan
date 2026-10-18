import { useEffect, useState } from 'react';
import { markVisited } from './persistence';
import { createPitchStore } from './state/store';
import { BoardDesktop } from './ui/board/BoardDesktop';
import { BoardPhone } from './ui/board/BoardPhone';
import { useBoardMetrics } from './ui/board/use-board-metrics';
import { resolveInitialSession } from './ui/session/initial-session';

export default function App() {
  const [store] = useState(() => {
    const { tactic, mode, phase } = resolveInitialSession();
    return createPitchStore({ tactic, ui: { mode, phase } });
  });
  useEffect(() => markVisited(), []);
  const metrics = useBoardMetrics();
  return metrics.layout === 'phone' ? <BoardPhone store={store} /> : <BoardDesktop store={store} />;
}
