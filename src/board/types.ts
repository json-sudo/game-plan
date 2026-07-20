export type PieceType = 'player' | 'ball';
export type Team = 'mine' | 'opponent';
export type SquadSize = 11 | 20 | 26;

export type PieceFill =
  { kind: 'solid'; color: string } | { kind: 'kit'; primary: string; secondary: string };

export interface Piece {
  id: string;
  type: PieceType;
  team: Team;
  label: string;
  position?: { x: number; y: number };
  fill: PieceFill;
  isKeeper?: boolean;
}

export interface BoardState {
  pieces: Piece[];
  squad: { mine: SquadSize; opponent: SquadSize };
  keeper: { mine: boolean; opponent: boolean };
  formation?: { mine?: string; opponent?: string };
}
