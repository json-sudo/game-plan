import { useState } from 'react';
import { createExampleDocument } from './state/example';
import { createPitchStore } from './state/store';
import { PHONE_MAX_WIDTH } from './shared/constants/breakpoints';
import { useBelowBreakpoint } from './shared/hooks/useBelowBreakpoint';
import { BoardDesktop } from './ui/board/BoardDesktop';
import { BoardPhone } from './ui/board/BoardPhone';

export default function App() {
  const [store] = useState(() =>
    createPitchStore({ doc: createExampleDocument(), ui: { mode: 'fm' } }),
  );
  const phone = useBelowBreakpoint(PHONE_MAX_WIDTH);
  return phone ? <BoardPhone store={store} /> : <BoardDesktop store={store} />;
}
