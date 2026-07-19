import { useEffect, useState } from 'react';
import type { Team } from '../../board/types';
import { FORMATIONS } from '../../board/formations';
import { useBoard, useBoardDispatch } from '../../board/BoardContext';
import { TEAM_COLORS } from '../../board/boardReducer';
import ClearIcon from '../../assets/clear.icon';
import ResetIcon from '../../assets/reset.icon';
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

export function TopBar() {
  const dispatch = useBoardDispatch();
  const [modalOpen, setModalOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

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
          </button>
        </div>
      </header>
      {modalOpen && <FormationModal onClose={() => setModalOpen(false)} />}
      {resetOpen && <ResetConfirmModal onClose={() => setResetOpen(false)} />}
    </>
  );
}
