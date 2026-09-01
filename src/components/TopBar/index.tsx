import { useEffect, useRef, useState } from 'react';
import type { Team } from '../../board/types';
import { PITCH_H } from '../../board/pitchGeometry';
import { useBoard, useBoardDispatch } from '../../board/BoardContext';
import { canSaveBoard } from '../../board/persistence';
import { usePersistedBoards } from '../../board/usePersistedBoards';
import { buildShareHash } from '../../board/shareCodec';
import { useNameEditor } from '../NameEditor';
import { FormationModal } from './FormationModal';
import { VisualizePanel, hasPlacedPlayers } from './VisualizePanel';
import { ResetConfirmModal } from './ResetConfirmModal';
import { SavePanel } from './SavePanel';
import { LoadPanel } from './LoadPanel';
import { SharePanel } from './SharePanel';
import { TopBarMenu } from './TopBarMenu';
import { ShareLinkErrorBanner } from './ShareLinkErrorBanner';
import ClearIcon from '../../assets/clear.icon';
import ResetIcon from '../../assets/reset.icon';
import DarkThemeIcon from '../../assets/dark.icon';
import LightThemeIcon from '../../assets/light-theme.icon';
import DownArrowIcon from '../../assets/down-arrow.icon';
import SaveIcon from '../../assets/save.icon';
import LoadIcon from '../../assets/load.icon';
import ShareIcon from '../../assets/share.icon';
import MenuIcon from '../../assets/menu.icon';
import RenameIcon from '../../assets/rename.icon';
import { useTheme } from '../../shared/hooks/useTheme';
import { useBelowBreakpoint } from '../../shared/hooks/useBelowBreakpoint';
import './top-bar.scss';

const TOP_BAR_BREAKPOINT = 825;

export function TopBar() {
  const board = useBoard();
  const dispatch = useBoardDispatch();
  const { theme, toggleTheme } = useTheme();
  const { renaming, toggleRenaming } = useNameEditor();
  const [modalOpen, setModalOpen] = useState(false);
  const [visualizeAttacker, setVisualizeAttacker] = useState<Team | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const persisted = usePersistedBoards();
  const isMobile = useBelowBreakpoint(TOP_BAR_BREAKPOINT);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLElement>(null);
  const menuWasOpenRef = useRef(false);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!isMobile) setMenuOpen(false);
  }, [isMobile]);

  useEffect(() => {
    if (menuOpen) {
      menuWasOpenRef.current = true;
      const firstItem =
        menuPanelRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)');
      firstItem?.focus();
    } else if (menuWasOpenRef.current) {
      menuWasOpenRef.current = false;
      menuButtonRef.current?.focus();
    }
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuPanelRef.current?.contains(target)) return;
      if (menuButtonRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const saveEnabled = persisted.storageAvailable && canSaveBoard(board);
  const saveTitle = !persisted.storageAvailable
    ? 'Saving is unavailable — this browser is blocking local storage.'
    : !canSaveBoard(board)
      ? 'Place at least 9 players to save this board.'
      : undefined;
  const loadVisible = !persisted.storageAvailable || persisted.slots.length > 0;
  const shareEnabled = canSaveBoard(board);

  const openShare = () => {
    window.location.hash = buildShareHash(board);
    setShareUrl(window.location.href);
  };

  const loadTitle = !persisted.storageAvailable
    ? 'Loading is unavailable — this browser is blocking local storage.'
    : undefined;

  const minePlaced = board.pieces.filter(
    (p) => p.team === 'mine' && p.type === 'player' && p.position !== undefined,
  );
  const mineAvgY = minePlaced.length
    ? minePlaced.reduce((sum, p) => sum + p.position!.y, 0) / minePlaced.length
    : 0;
  const attackingHalfGuess: Team = mineAvgY < PITCH_H / 2 ? 'mine' : 'opponent';
  const inferredAttacker: Team = hasPlacedPlayers(board, attackingHalfGuess)
    ? attackingHalfGuess
    : attackingHalfGuess === 'mine'
      ? 'opponent'
      : 'mine';

  const totalPlaced = board.pieces.filter(
    (p) => p.type === 'player' && p.position !== undefined,
  ).length;
  const defendingTeam: Team = inferredAttacker === 'mine' ? 'opponent' : 'mine';
  const defendingCount = board.pieces.filter(
    (p) => p.team === defendingTeam && p.type === 'player' && p.position !== undefined,
  ).length;
  const visualizeEnabled = totalPlaced >= 7 && defendingCount >= 2;

  const themeToggleButton = (
    <button
      type="button"
      className="top-bar__action"
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      onClick={toggleTheme}
    >
      {theme === 'light' ? <DarkThemeIcon /> : <LightThemeIcon />}
    </button>
  );

  const formationButton = (
    <button type="button" className="top-bar__formation" onClick={() => setModalOpen(true)}>
      Formation
      <DownArrowIcon />
    </button>
  );

  return (
    <>
      <header className="top-bar">
        <span className="top-bar__wordmark">Game Plan</span>
        <div className="top-bar__actions">
          {isMobile ? (
            <>
              {formationButton}
              {themeToggleButton}
              <button
                type="button"
                ref={menuButtonRef}
                className={
                  menuOpen
                    ? 'top-bar__menu-button top-bar__menu-button--open'
                    : 'top-bar__menu-button'
                }
                aria-expanded={menuOpen}
                aria-controls="top-bar-menu-panel"
                aria-label="Menu"
                title="Menu"
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? <ClearIcon /> : <MenuIcon />}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={renaming ? 'top-bar__action top-bar__action--active' : 'top-bar__action'}
                aria-pressed={renaming}
                onClick={toggleRenaming}
              >
                <RenameIcon />
                Rename pieces
              </button>
              <button
                type="button"
                className="top-bar__action"
                onClick={() => dispatch({ type: 'CLEAR_PITCH' })}
              >
                <ClearIcon />
                Clear pitch
              </button>
              <button type="button" className="top-bar__action" onClick={() => setResetOpen(true)}>
                <ResetIcon />
                Reset
              </button>
              {formationButton}
              {!modalOpen && !visualizeAttacker && (
                <button
                  type="button"
                  className="top-bar__action top-bar__action--visualize"
                  disabled={!visualizeEnabled}
                  onClick={() => setVisualizeAttacker(inferredAttacker)}
                >
                  Visualize
                </button>
              )}
              <button
                type="button"
                className="top-bar__formation"
                disabled={!saveEnabled}
                title={saveTitle}
                onClick={() => setSaveOpen(true)}
              >
                <SaveIcon />
                Save
              </button>
              {loadVisible && (
                <button
                  type="button"
                  className="top-bar__formation"
                  disabled={!persisted.storageAvailable}
                  title={loadTitle}
                  onClick={() => setLoadOpen(true)}
                >
                  <LoadIcon />
                  Load
                </button>
              )}
              <button
                type="button"
                className="top-bar__icon-button"
                disabled={!shareEnabled}
                title="Share your current edits"
                aria-label="Share your current edits"
                onClick={openShare}
              >
                <ShareIcon />
              </button>
              {themeToggleButton}
            </>
          )}
        </div>
      </header>
      {isMobile && (
        <TopBarMenu
          panelRef={menuPanelRef}
          open={menuOpen}
          renaming={renaming}
          onToggleRename={() => {
            toggleRenaming();
            setMenuOpen(false);
          }}
          onClear={() => {
            dispatch({ type: 'CLEAR_PITCH' });
            setMenuOpen(false);
          }}
          onReset={() => {
            setResetOpen(true);
            setMenuOpen(false);
          }}
          onSave={() => {
            setSaveOpen(true);
            setMenuOpen(false);
          }}
          saveEnabled={saveEnabled}
          saveTitle={saveTitle}
          loadVisible={loadVisible}
          loadEnabled={persisted.storageAvailable}
          loadTitle={loadTitle}
          onLoad={() => {
            setLoadOpen(true);
            setMenuOpen(false);
          }}
          onShare={() => {
            openShare();
            setMenuOpen(false);
          }}
          shareEnabled={shareEnabled}
        />
      )}
      <ShareLinkErrorBanner />
      {modalOpen && (
        <FormationModal
          onClose={() => setModalOpen(false)}
          onVisualize={(attacker) => setVisualizeAttacker(attacker)}
        />
      )}
      {visualizeAttacker && (
        <VisualizePanel
          attacker={visualizeAttacker}
          setAttacker={setVisualizeAttacker}
          onClose={() => setVisualizeAttacker(null)}
        />
      )}
      {resetOpen && <ResetConfirmModal onClose={() => setResetOpen(false)} />}
      {saveOpen && (
        <SavePanel
          board={board}
          persisted={persisted}
          onClose={() => setSaveOpen(false)}
          onSaved={() => setToast('Board saved')}
        />
      )}
      {loadOpen && (
        <LoadPanel
          persisted={persisted}
          onClose={() => setLoadOpen(false)}
          onLoaded={(loadedBoard) => dispatch({ type: 'LOAD_BOARD', board: loadedBoard })}
        />
      )}
      {shareUrl && <SharePanel url={shareUrl} onClose={() => setShareUrl(null)} />}
      {toast && (
        <div className="top-bar__toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}
