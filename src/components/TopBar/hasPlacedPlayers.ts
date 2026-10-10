import type { BoardState, Team } from '../../board/types';

export function hasPlacedPlayers(board: BoardState, team: Team): boolean {
  return board.pieces.some(
    (p) => p.team === team && p.type === 'player' && p.position !== undefined,
  );
}
