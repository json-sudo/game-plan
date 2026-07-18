import { useEffect, useState } from 'react';
import type { Team } from '../../board/types';
import { FORMATIONS } from '../../board/formations';
import { useBoardDispatch } from '../../board/BoardContext';
import { TEAM_COLORS } from '../../board/boardReducer';
import './top-bar.scss';

function FormationModal({ onClose }: { onClose: () => void }) {
  const dispatch = useBoardDispatch();
  const [team, setTeam] = useState<Team>('mine');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const apply = (name: string) => {
    dispatch({ type: 'APPLY_FORMATION', team, name });
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
              className={team === 'mine' ? 'is-active' : undefined}
              onClick={() => setTeam('mine')}
            >
              <span className="formation-modal__dot" style={{ background: TEAM_COLORS.mine }} />
              My Team
            </button>
            <button
              type="button"
              className={team === 'opponent' ? 'is-active' : undefined}
              onClick={() => setTeam('opponent')}
            >
              <span className="formation-modal__dot" style={{ background: TEAM_COLORS.opponent }} />
              Opponent
            </button>
          </div>
        </div>

        <ul className="formation-modal__list">
          {FORMATIONS.map((f) => (
            <li key={f.name}>
              <button type="button" onClick={() => apply(f.name)}>
                {f.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function TopBar() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <header className="top-bar">
        <span className="top-bar__wordmark">Game Plan</span>
        <button type="button" className="top-bar__formation" onClick={() => setModalOpen(true)}>
          Formation
        </button>
      </header>
      {modalOpen && <FormationModal onClose={() => setModalOpen(false)} />}
    </>
  );
}
