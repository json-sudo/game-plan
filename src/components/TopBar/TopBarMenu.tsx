import ClearIcon from '../../assets/clear.icon';
import ResetIcon from '../../assets/reset.icon';
import SaveIcon from '../../assets/save.icon';
import LoadIcon from '../../assets/load.icon';
import ShareIcon from '../../assets/share.icon';
import RenameIcon from '../../assets/rename.icon';

export function TopBarMenu({
  panelRef,
  open,
  renaming,
  onToggleRename,
  onClear,
  onReset,
  onSave,
  saveEnabled,
  saveTitle,
  loadVisible,
  loadEnabled,
  loadTitle,
  onLoad,
  onShare,
  shareEnabled,
}: {
  panelRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  renaming: boolean;
  onToggleRename: () => void;
  onClear: () => void;
  onReset: () => void;
  onSave: () => void;
  saveEnabled: boolean;
  saveTitle: string | undefined;
  loadVisible: boolean;
  loadEnabled: boolean;
  loadTitle: string | undefined;
  onLoad: () => void;
  onShare: () => void;
  shareEnabled: boolean;
}) {
  return (
    <div
      id="top-bar-menu-panel"
      className={open ? 'top-bar__menu top-bar__menu--open' : 'top-bar__menu'}
      inert={!open}
    >
      <nav className="top-bar__menu-list" aria-label="Menu" ref={panelRef}>
        <button
          type="button"
          className={
            renaming ? 'top-bar__menu-item top-bar__menu-item--active' : 'top-bar__menu-item'
          }
          aria-pressed={renaming}
          onClick={onToggleRename}
        >
          <RenameIcon />
          Rename pieces
        </button>
        <button type="button" className="top-bar__menu-item" onClick={onClear}>
          <ClearIcon />
          Clear pitch
        </button>
        <button type="button" className="top-bar__menu-item" onClick={onReset}>
          <ResetIcon />
          Reset
        </button>
        <button
          type="button"
          className="top-bar__menu-item"
          disabled={!saveEnabled}
          title={saveTitle}
          onClick={onSave}
        >
          <SaveIcon />
          Save
        </button>
        {loadVisible && (
          <button
            type="button"
            className="top-bar__menu-item"
            disabled={!loadEnabled}
            title={loadTitle}
            onClick={onLoad}
          >
            <LoadIcon />
            Load
          </button>
        )}
        <button
          type="button"
          className="top-bar__menu-item"
          disabled={!shareEnabled}
          title="Share your current edits"
          onClick={onShare}
        >
          <ShareIcon />
          Share
        </button>
      </nav>
    </div>
  );
}
