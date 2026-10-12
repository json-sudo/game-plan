import type { BoardState, Piece, Team } from './types';

const STARTER_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];

function makePlayer(team: Team, id: string, label: string): Piece {
  return {
    id,
    type: 'player',
    team,
    label,
    fill: { kind: 'solid', color: team === 'mine' ? '#1d4ed8' : '#b91c1c' },
  };
}

export function createInitialBoard(): BoardState {
  const teamPieces = (team: Team): Piece[] =>
    STARTER_LABELS.map((label, i) => makePlayer(team, `${team}-${i + 1}`, label));
  return {
    pieces: [
      ...teamPieces('mine'),
      ...teamPieces('opponent'),
      { id: 'ball', type: 'ball', team: 'mine', label: '', fill: { kind: 'solid', color: '#fff' } },
    ],
    squad: { mine: 11, opponent: 11 },
    keeper: { mine: false, opponent: false },
  };
}
