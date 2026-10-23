import { useEffect, useState } from 'react';
import { markVisited } from './persistence';
import { clearShareHash } from './share';
import { createPitchStore } from './state/store';
import { BoardDesktop } from './ui/board/BoardDesktop';
import { BoardPhone } from './ui/board/BoardPhone';
import { useBoardMetrics } from './ui/board/use-board-metrics';
import { SessionNotices } from './ui/feedback/SessionNotices';
import {
  openedShareLink,
  resolveInitialSession,
  sessionNotices,
} from './ui/session/initial-session';

export default function App() {
  const [session] = useState(() => resolveInitialSession());
  const [store] = useState(() =>
    createPitchStore({ tactic: session.tactic, ui: { mode: session.mode } }),
  );
  const notices = sessionNotices(session);
  useEffect(() => markVisited(), []);
  useEffect(() => {
    if (openedShareLink(session)) clearShareHash();
  }, [session]);
  const metrics = useBoardMetrics();
  const board =
    metrics.layout === 'phone' ? <BoardPhone store={store} /> : <BoardDesktop store={store} />;
  return (
    <>
      <SessionNotices notices={notices} />
      {board}
    </>
  );
}
