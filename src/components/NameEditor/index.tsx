import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import type { Piece } from '../../board/types';
import { useBoardDispatch } from '../../board/BoardContext';
import './name-editor.scss';

export const PIECE_NAME_MAX_LENGTH = 24;

interface NameEditorApi {
  openNameEditor: (piece: Piece, anchor: DOMRect) => void;
}

const NameEditorContext = createContext<NameEditorApi | null>(null);

export function useNameEditor(): NameEditorApi {
  const api = useContext(NameEditorContext);
  if (!api) throw new Error('useNameEditor must be used within NameEditorProvider');
  return api;
}

interface EditorState {
  pieceId: string;
  initial: string;
  left: number;
  top: number;
}

export function NameEditorProvider({ children }: { children: ReactNode }) {
  const dispatch = useBoardDispatch();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const cancelledRef = useRef(false);

  const openNameEditor = (piece: Piece, anchor: DOMRect) => {
    if (piece.type !== 'player') return;
    cancelledRef.current = false;
    setEditor({
      pieceId: piece.id,
      initial: piece.name ?? '',
      left: anchor.left + anchor.width / 2,
      top: anchor.bottom + 4,
    });
  };

  const commitOnBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!editor) return;
    if (!cancelledRef.current) {
      dispatch({ type: 'SET_PIECE_NAME', id: editor.pieceId, name: e.currentTarget.value });
    }
    setEditor(null);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      cancelledRef.current = true;
      e.currentTarget.blur();
    }
  };

  return (
    <NameEditorContext.Provider value={{ openNameEditor }}>
      {children}
      {editor && (
        <input
          key={editor.pieceId}
          ref={(el) => el?.focus()}
          className="name-editor"
          style={{ left: editor.left, top: editor.top }}
          type="text"
          aria-label="Piece name"
          maxLength={PIECE_NAME_MAX_LENGTH}
          defaultValue={editor.initial}
          onBlur={commitOnBlur}
          onKeyDown={onKeyDown}
        />
      )}
    </NameEditorContext.Provider>
  );
}
