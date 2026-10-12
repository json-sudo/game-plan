import { lazy, Suspense } from 'react';
import { useTheme } from './shared/hooks/useTheme';

export default function App() {
  if (import.meta.env.DEV) {
    const DevGallery = lazy(() => import('./dev/Gallery'));
    return (
      <Suspense fallback={<p>Loading component gallery…</p>}>
        <DevGallery />
      </Suspense>
    );
  }

  return <Placeholder />;
}

function Placeholder() {
  const { theme, toggleTheme } = useTheme();
  return (
    <main style={{ padding: '2rem', fontFamily: 'Figtree, sans-serif' }}>
      <h1>Game Plan is being rebuilt</h1>
      <button type="button" onClick={toggleTheme}>
        Theme: {theme}
      </button>
    </main>
  );
}
