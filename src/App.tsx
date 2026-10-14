import { lazy, Suspense, useState } from 'react';
import { createExampleDocument } from './state/example';
import { createPitchStore } from './state/store';
import { BoardDesktop } from './ui/board/BoardDesktop';

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
  return <BoardDesktop store={store} />;
}
