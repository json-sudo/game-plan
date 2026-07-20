import { useEffect, useRef, useState } from 'react';
import type { BoardState, Team } from '../../board/types';
import { FORMATIONS } from '../../board/formations';
import { useBoard, useBoardDispatch, useShareLinkError } from '../../board/BoardContext';
import { TEAM_COLORS } from '../../board/boardReducer';
import { canSaveBoard, SLOT_NAME_MAX_LENGTH } from '../../board/persistence';
import { usePersistedBoards } from '../../board/usePersistedBoards';
import { buildShareHash } from '../../board/shareCodec';
import ClearIcon from '../../assets/clear.icon';
import ResetIcon from '../../assets/reset.icon';
import DarkThemeIcon from '../../assets/dark.icon';
import LightThemeIcon from '../../assets/light-theme.icon';
import DownArrowIcon from '../../assets/down-arrow.icon';
import SaveIcon from '../../assets/save.icon';
import LoadIcon from '../../assets/load.icon';
import ShareIcon from '../../assets/share.icon';
import { useTheme } from '../../shared/hooks/useTheme';
import './top-bar.scss';

type ApplyMode = Team | 'matchup';

const TEAM_NAMES: Record<Team, string> = { mine: 'My Team', opponent: 'Opponent' };

function FormationPicker({
  team,
  value,
  onChange,
}: {
  team: Team;
  value: string;
  onChange: (name: string) => void;
}) {
  return (
    <div className="formation-modal__picker">
      <span className="formation-modal__picker-label">
        <span className="formation-modal__dot" style={{ background: TEAM_COLORS[team] }} />
        {TEAM_NAMES[team]}
      </span>
      <div role="group" aria-label={`${TEAM_NAMES[team]} formation`}>
        {FORMATIONS.map((f) => (
          <button
            key={f.name}
            type="button"
            className={value === f.name ? 'is-active' : undefined}
            onClick={() => onChange(f.name)}
          >
            {f.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function FormationModal({ onClose }: { onClose: () => void }) {
  const board = useBoard();
  const dispatch = useBoardDispatch();
  const [mode, setMode] = useState<ApplyMode>('mine');
  const [attacker, setAttacker] = useState<Team>('mine');
  const [picks, setPicks] = useState<{ mine: string; opponent: string }>({
    mine: board.formation?.mine ?? '4-3-3',
    opponent: board.formation?.opponent ?? '4-3-3',
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const apply = (name: string) => {
    dispatch({ type: 'APPLY_FORMATION', team: mode as Team, name });
    onClose();
  };

  const applyMatchup = () => {
    dispatch({ type: 'APPLY_MATCHUP', attacker, formations: picks });
    onClose();
  };

  return (
    <div className="formation-modal__backdrop" onClick={onClose}>
      <div
        className="formation-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Formation preset"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="formation-modal__header">
          <h2>Formation Preset</h2>
          <button type="button" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="formation-modal__teams">
          <span className="formation-modal__teams-label">Apply to</span>
          <div role="group" aria-label="Apply to">
            <button
              type="button"
              className={mode === 'mine' ? 'is-active' : undefined}
              onClick={() => setMode('mine')}
            >
              <span className="formation-modal__dot" style={{ background: TEAM_COLORS.mine }} />
              My Team
            </button>
            <button
              type="button"
              className={mode === 'opponent' ? 'is-active' : undefined}
              onClick={() => setMode('opponent')}
            >
              <span className="formation-modal__dot" style={{ background: TEAM_COLORS.opponent }} />
              Opponent
            </button>
            <button
              type="button"
              className={mode === 'matchup' ? 'is-active' : undefined}
              onClick={() => setMode('matchup')}
            >
              Matchup
            </button>
          </div>
        </div>

        {mode !== 'matchup' ? (
          <ul className="formation-modal__list">
            {FORMATIONS.map((f) => (
              <li key={f.name}>
                <button type="button" onClick={() => apply(f.name)}>
                  {f.name}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="formation-modal__matchup">
            <div className="formation-modal__teams">
              <span className="formation-modal__teams-label">Attacker</span>
              <div role="group" aria-label="Attacker">
                <button
                  type="button"
                  className={attacker === 'mine' ? 'is-active' : undefined}
                  onClick={() => setAttacker('mine')}
                >
                  My Team attacks
                </button>
                <button
                  type="button"
                  className={attacker === 'opponent' ? 'is-active' : undefined}
                  onClick={() => setAttacker('opponent')}
                >
                  Opponent attacks
                </button>
              </div>
            </div>
            <FormationPicker
              team="mine"
              value={picks.mine}
              onChange={(name) => setPicks((p) => ({ ...p, mine: name }))}
            />
            <FormationPicker
              team="opponent"
              value={picks.opponent}
              onChange={(name) => setPicks((p) => ({ ...p, opponent: name }))}
            />
            <button type="button" className="formation-modal__apply" onClick={applyMatchup}>
              Apply
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ResetConfirmModal({ onClose }: { onClose: () => void }) {
  const dispatch = useBoardDispatch();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const confirm = () => {
    dispatch({ type: 'RESET_BOARD' });
    onClose();
  };

  return (
    <div className="formation-modal__backdrop" onClick={onClose}>
      <div
        className="formation-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Reset board"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="formation-modal__header">
          <h2>Reset Board</h2>
          <button type="button" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        <p className="reset-confirm__message">
          Reset everything? Squads return to 11, keepers off, labels and formations cleared. This
          cannot be undone.
        </p>
        <div className="reset-confirm__actions">
          <button type="button" className="reset-confirm__cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="reset-confirm__confirm" onClick={confirm}>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

type PersistedBoards = ReturnType<typeof usePersistedBoards>;

const NEW_SLOT = '__new__';

function formatTimestamp(savedAt: number): string {
  return new Date(savedAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function SavePanel({
  board,
  persisted,
  onClose,
  onSaved,
}: {
  board: BoardState;
  persisted: PersistedBoards;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { slots, currentSlotId, save } = persisted;
  const atCap = slots.length >= 2;
  const currentIsSlot = slots.some((s) => s.id === currentSlotId);
  const [selected, setSelected] = useState<string | null>(() => {
    if (currentIsSlot) return currentSlotId;
    if (!atCap) return NEW_SLOT;
    return null;
  });
  const [name, setName] = useState(() => {
    if (currentIsSlot) return slots.find((s) => s.id === currentSlotId)?.name ?? '';
    return '';
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const selectSlot = (id: string) => {
    setSelected(id);
    setName(id === NEW_SLOT ? '' : (slots.find((s) => s.id === id)?.name ?? ''));
    setError(null);
  };

  const confirm = () => {
    if (!selected || !name.trim()) return;
    const targetSlotId = selected === NEW_SLOT ? null : selected;
    const result = save(targetSlotId, name, board);
    if (result.status === 'error') {
      setError(result.message);
      return;
    }
    onSaved();
    onClose();
  };

  return (
    <div className="formation-modal__backdrop" onClick={onClose}>
      <div
        className="slot-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Save board"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="formation-modal__header">
          <h2>Save Board</h2>
          <button type="button" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>

        <ul className="slot-panel__list">
          {slots.map((slot) => (
            <li key={slot.id}>
              <button
                type="button"
                className={selected === slot.id ? 'is-active' : undefined}
                onClick={() => selectSlot(slot.id)}
              >
                <span className="slot-panel__row-name">{slot.name}</span>
                <span className="slot-panel__row-time">{formatTimestamp(slot.savedAt)}</span>
              </button>
            </li>
          ))}
          {!atCap && (
            <li>
              <button
                type="button"
                className={selected === NEW_SLOT ? 'is-active' : undefined}
                onClick={() => selectSlot(NEW_SLOT)}
              >
                <span className="slot-panel__row-name">New slot</span>
              </button>
            </li>
          )}
        </ul>

        {atCap && (
          <p className="slot-panel__hint">
            Both save slots are full. Choose one above to overwrite it, or create an account for
            unlimited, cross-device boards.
          </p>
        )}
        {!selected && atCap && (
          <p className="slot-panel__hint">Pick a slot to overwrite before saving.</p>
        )}

        <div className="slot-panel__name">
          <label htmlFor="slot-name-input">Name</label>
          <input
            id="slot-name-input"
            type="text"
            value={name}
            maxLength={SLOT_NAME_MAX_LENGTH}
            disabled={!selected}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {error && <p className="slot-panel__error">{error}</p>}

        <div className="reset-confirm__actions">
          <button type="button" className="reset-confirm__cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="reset-confirm__confirm"
            disabled={!selected || !name.trim()}
            onClick={confirm}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadPanel({
  persisted,
  onClose,
  onLoaded,
}: {
  persisted: PersistedBoards;
  onClose: () => void;
  onLoaded: (board: BoardState) => void;
}) {
  const { slots, loadSlot } = persisted;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const select = (id: string) => {
    const result = loadSlot(id);
    if (result.status !== 'ok') {
      setError("Couldn't load that board — the saved data looks corrupted.");
      return;
    }
    onLoaded(result.slot.board);
    onClose();
  };

  return (
    <div className="formation-modal__backdrop" onClick={onClose}>
      <div
        className="slot-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Load board"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="formation-modal__header">
          <h2>Load Board</h2>
          <button type="button" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>

        <ul className="slot-panel__list">
          {slots.map((slot) => (
            <li key={slot.id}>
              <button type="button" onClick={() => select(slot.id)}>
                <span className="slot-panel__row-name">{slot.name}</span>
                <span className="slot-panel__row-time">{formatTimestamp(slot.savedAt)}</span>
              </button>
            </li>
          ))}
        </ul>

        {error && <p className="slot-panel__error">{error}</p>}
      </div>
    </div>
  );
}

function SharePanel({ url, onClose }: { url: string; onClose: () => void }) {
  const [copyState, setCopyState] = useState<'pending' | 'copied' | 'failed'>('pending');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    inputRef.current?.select();
    if (!navigator.clipboard?.writeText) {
      setCopyState('failed');
      return;
    }
    navigator.clipboard.writeText(url).then(
      () => setCopyState('copied'),
      () => setCopyState('failed'),
    );
  }, [url]);

  return (
    <div className="formation-modal__backdrop" onClick={onClose}>
      <div
        className="slot-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Share board"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="formation-modal__header">
          <h2>Share Board</h2>
          <button type="button" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>

        <p className="slot-panel__hint">
          {copyState === 'copied'
            ? 'Link copied to clipboard.'
            : 'Copy this link to share your board:'}
        </p>

        <div className="slot-panel__name">
          <label htmlFor="share-url-input">Link</label>
          <input
            id="share-url-input"
            ref={inputRef}
            type="text"
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
      </div>
    </div>
  );
}

function ShareLinkErrorBanner() {
  const [hasError, dismiss] = useShareLinkError();
  if (!hasError) return null;
  return (
    <div className="top-bar__banner" role="alert">
      <span>This link couldn't be opened — it may be broken or from an unsupported version.</span>
      <button type="button" aria-label="Dismiss" onClick={dismiss}>
        ×
      </button>
    </div>
  );
}

export function TopBar() {
  const board = useBoard();
  const dispatch = useBoardDispatch();
  const { theme, toggleTheme } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const persisted = usePersistedBoards();

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const saveEnabled = persisted.storageAvailable && canSaveBoard(board);
  const saveTitle = !persisted.storageAvailable
    ? 'Saving is unavailable — this browser is blocking local storage.'
    : !canSaveBoard(board)
      ? 'Place at least 9 players to save this board.'
      : undefined;
  const loadVisible = !persisted.storageAvailable || persisted.slots.length > 0;
  // Same gate as Save, reusing the identical predicate so the two never drift apart.
  const shareEnabled = canSaveBoard(board);

  const openShare = () => {
    window.location.hash = buildShareHash(board);
    setShareUrl(window.location.href);
  };

  return (
    <>
      <header className="top-bar">
        <span className="top-bar__wordmark">Game Plan</span>
        <div className="top-bar__actions">
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
          <button type="button" className="top-bar__formation" onClick={() => setModalOpen(true)}>
            Formation
            <DownArrowIcon />
          </button>
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
              title={
                !persisted.storageAvailable
                  ? 'Loading is unavailable — this browser is blocking local storage.'
                  : undefined
              }
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
          <button
            type="button"
            className="top-bar__action"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            onClick={toggleTheme}
          >
            {theme === 'light' ? <DarkThemeIcon /> : <LightThemeIcon />}
          </button>
        </div>
      </header>
      <ShareLinkErrorBanner />
      {modalOpen && <FormationModal onClose={() => setModalOpen(false)} />}
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
