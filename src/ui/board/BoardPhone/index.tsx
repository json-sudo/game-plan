import { useEffect, useState } from 'react';
import { useStore, type StoreApi } from 'zustand';
import { selectCanUndo } from '../../../state/selectors';
import type { PitchStore } from '../../../state/store';
import { PhoneMenu, type PhoneMenuEntry } from '../../chrome/PhoneMenu';
import { UndoControl } from '../../chrome/UndoControl';
import {
  CLEAR_LABEL,
  MODE_LABELS,
  RESET_DISABLED_REASON,
  RESET_LABEL,
  THEME_DARK_LABEL,
  THEME_LIGHT_LABEL,
} from '../../copy';
import { Button } from '../../controls/Button';
import styles from './board-phone.module.scss';

const MODE_ITEM_PREFIX = 'Mode: ';
const MENU_LABEL = 'Menu';

export interface BoardPhoneProps {
  store: StoreApi<PitchStore>;
}

export function BoardPhone({ store }: BoardPhoneProps) {
  const doc = useStore(store, (state) => state.doc);
  const ui = useStore(store, (state) => state.ui);
  const canUndo = useStore(store, selectCanUndo);
  const [menuOpen, setMenuOpen] = useState(false);
  const canReset = doc.teams.mine.applied !== null || doc.teams.opponent.applied !== null;
  const fm = ui.mode === 'fm';
  const dark = ui.theme === 'dark';

  useEffect(() => {
    document.documentElement.dataset.theme = ui.theme;
  }, [ui.theme]);

  const choose = (action: () => void) => () => {
    setMenuOpen(false);
    action();
  };

  const menuItems: PhoneMenuEntry[] = [
    {
      icon: 'edit',
      label: `${MODE_ITEM_PREFIX}${MODE_LABELS[fm ? 'fm' : 'open']}`,
      onSelect: choose(() => store.getState().setMode(fm ? 'openPitch' : 'fm')),
    },
    {
      icon: 'reset',
      label: RESET_LABEL,
      disabled: !canReset,
      note: canReset ? undefined : RESET_DISABLED_REASON,
      onSelect: choose(() => store.getState().dispatch({ type: 'reset' })),
    },
    {
      icon: 'clear',
      label: CLEAR_LABEL,
      onSelect: choose(() => store.getState().dispatch({ type: 'clearScenario' })),
    },
    {
      icon: dark ? 'sun' : 'moon',
      label: dark ? THEME_LIGHT_LABEL : THEME_DARK_LABEL,
      onSelect: choose(() => store.getState().patchUi({ theme: dark ? 'light' : 'dark' })),
    },
  ];

  return (
    <div className={styles.board}>
      <header className={styles.top}>
        <div className={styles.title}>{`${doc.teams.mine.name} v ${doc.teams.opponent.name}`}</div>
        <UndoControl canUndo={canUndo} redo={false} onUndo={() => store.getState().undo()} />
        <Button
          variant="icon"
          icon="menu"
          label={MENU_LABEL}
          pressed={menuOpen}
          onClick={() => setMenuOpen(true)}
        />
      </header>
      {menuOpen ? <PhoneMenu items={menuItems} onClose={() => setMenuOpen(false)} /> : null}
    </div>
  );
}
