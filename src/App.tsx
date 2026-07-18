import { BoardProvider } from './board/BoardContext';
import { DragProvider } from './board/DragContext';
import { Bench } from './components/Bench';
import { Pitch } from './components/Pitch';
import { TopBar } from './components/TopBar';
import './App.scss';

export default function App() {
  return (
    <BoardProvider>
      <DragProvider>
        <TopBar />
        <main className="app">
          <div className="app__pitch-area">
            <Pitch />
          </div>
          <Bench />
        </main>
      </DragProvider>
    </BoardProvider>
  );
}
