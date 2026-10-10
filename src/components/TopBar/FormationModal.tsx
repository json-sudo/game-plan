import { useState } from 'react';
import type { Team } from '../../board/types';
import { FORMATIONS } from '../../board/formations';
import { useBoard, useBoardDispatch } from '../../board/useBoard';
import { TEAM_COLORS } from '../../board/boardReducer';
import { Modal } from './Modal';

type ApplyMode = Team | 'matchup';

const TEAM_NAMES: Record<Team, string> = { mine: 'My Formation', opponent: 'Opponent Formation' };

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
      <select
        id={`${TEAM_NAMES[team].replaceAll(' ', '-').toLowerCase()}-select`}
        aria-label={TEAM_NAMES[team]}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {FORMATIONS.map((f) => (
          <option key={f.name} value={f.name}>
            {f.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function FormationModal({
  onClose,
  onVisualize,
}: {
  onClose: () => void;
  onVisualize?: (attacker: Team) => void;
}) {
  const board = useBoard();
  const dispatch = useBoardDispatch();
  const [mode, setMode] = useState<ApplyMode>('mine');
  const [attacker, setAttacker] = useState<Team>('mine');
  const [picks, setPicks] = useState<{ mine: string; opponent: string }>({
    mine: board.formation?.mine ?? '4-3-3',
    opponent: board.formation?.opponent ?? '4-3-3',
  });
  const [visualizeToggle, setVisualizeToggle] = useState(false);

  const apply = (name: string) => {
    dispatch({ type: 'APPLY_FORMATION', team: mode as Team, name });
    onClose();
  };

  const applyMatchup = () => {
    dispatch({ type: 'APPLY_MATCHUP', attacker, formations: picks });
    if (visualizeToggle && onVisualize) {
      onVisualize(attacker);
    }
    onClose();
  };

  return (
    <Modal label="Formation preset" className="formation-modal" onClose={onClose}>
      <header className="formation-modal__header">
        <h2>Formation Preset</h2>
        <button type="button" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </header>

      <div className="formation-modal__teams">
        <fieldset className="formation-tabs" aria-label="Apply to">
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
        </fieldset>
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
          <div className="formation-modal__teams">
            <span className="formation-modal__teams-label">Attacking side</span>
            <fieldset className="attacking-side-picker" aria-label="Attacker">
              <button
                type="button"
                className={attacker === 'mine' ? 'is-active' : undefined}
                onClick={() => setAttacker('mine')}
              >
                Mine
              </button>
              <button
                type="button"
                className={attacker === 'opponent' ? 'is-active' : undefined}
                onClick={() => setAttacker('opponent')}
              >
                Opponent
              </button>
            </fieldset>
          </div>

          <button
            type="button"
            className={
              visualizeToggle
                ? 'formation-modal__visualize-toggle is-active'
                : 'formation-modal__visualize-toggle'
            }
            aria-pressed={visualizeToggle}
            onClick={() => setVisualizeToggle((v) => !v)}
          >
            Visualize
          </button>
          <button type="button" className="formation-modal__apply" onClick={applyMatchup}>
            Apply matchup
          </button>
        </div>
      )}
    </Modal>
  );
}
