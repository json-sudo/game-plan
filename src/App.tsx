import { lazy, Suspense, useState } from 'react';
import { createExampleDocument } from './state/example';
import { createPitchStore } from './state/store';
import { PHONE_MAX_WIDTH } from './shared/constants/breakpoints';
import { useBelowBreakpoint } from './shared/hooks/useBelowBreakpoint';
import { BoardDesktop } from './ui/board/BoardDesktop';
import { BoardPhone } from './ui/board/BoardPhone';

const DevGallery = import.meta.env.DEV ? lazy(() => import('./dev/Gallery')) : null;

export default function App() {
  if (DevGallery) {
    return (
      <Suspense fallback={<p>Loading component gallery…</p>}>
        <DevGallery />
      </Suspense>
    );
  }

  return <PitchApp />;
}

function PitchApp() {
  const [store] = useState(() =>
    createPitchStore({ doc: createExampleDocument(), ui: { mode: 'fm' } }),
  );
  const phone = useBelowBreakpoint(PHONE_MAX_WIDTH);
  return phone ? <BoardPhone store={store} /> : <BoardDesktop store={store} />;
}
