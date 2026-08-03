import { BoardProvider } from './board/BoardContext';
import { DragProvider } from './board/DragContext';
import { VisualizeProvider } from './board/VisualizeContext';
import { Bench } from './components/Bench';
import { NameEditorProvider } from './components/NameEditor';
import { Pitch } from './components/Pitch';
import { TopBar } from './components/TopBar';
import './App.scss';

export default function App() {
  return (
    <BoardProvider>
      <DragProvider>
        <NameEditorProvider>
          <VisualizeProvider>
            <TopBar />
            <main className="app">
              <div className="app__pitch-area">
                <Pitch />
              </div>
              <Bench />
            </main>
          </VisualizeProvider>
        </NameEditorProvider>
      </DragProvider>
    </BoardProvider>
  );
}
