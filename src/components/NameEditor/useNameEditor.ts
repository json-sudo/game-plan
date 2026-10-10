import { createContext, useContext } from 'react';
import type { Piece } from '../../board/types';

export interface NameEditorApi {
  renaming: boolean;
  toggleRenaming: () => void;
  openNameEditor: (piece: Piece, anchor: DOMRect) => void;
}

export const NameEditorContext = createContext<NameEditorApi | null>(null);

export function useNameEditor(): NameEditorApi {
  const api = useContext(NameEditorContext);
  if (!api) throw new Error('useNameEditor must be used within NameEditorProvider');
  return api;
}
