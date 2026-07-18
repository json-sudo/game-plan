import type { BoardState, Piece, SquadSize, Team } from './types';

// Must match the board colors in src/shared/styles/_variables.scss
export const TEAM_COLORS = {
  mine: '#1C3D6E',
  mineKeeper: '#C5882A',
  opponent: '#7A1C2E',
  opponentKeeper: '#4A2F7A',
  ball: '#FFFFFF',
} as const;

const STARTER_LABELS = ['CB', 'CB', 'LB', 'RB', 'CM', 'CM', 'LW', 'RW', 'ST', 'DM'];

export type BoardAction =
  | { type: 'PLACE_PIECE'; id: string; position: { x: number; y: number } }
  | { type: 'BENCH_PIECE'; id: string }
  | { type: 'SET_SQUAD'; team: Team; size: SquadSize }
  | { type: 'SET_KEEPER'; team: Team; on: boolean };

export function subNumber(piece: Piece): number | null {
  const m = /^S(\d+)$/.exec(piece.label);
  return m ? Number(m[1]) : null;
}

function playerColor(team: Team, isKeeper: boolean): string {
  if (team === 'mine') return isKeeper ? TEAM_COLORS.mineKeeper : TEAM_COLORS.mine;
  return isKeeper ? TEAM_COLORS.opponentKeeper : TEAM_COLORS.opponent;
}

function makePlayer(team: Team, id: string, label: string, isKeeper = false): Piece {
  return {
    id,
    type: 'player',
    team,
    label,
    fill: { kind: 'solid', color: playerColor(team, isKeeper) },
    ...(isKeeper ? { isKeeper: true } : {}),
  };
}

function makeSubs(team: Team, from: number, to: number): Piece[] {
  const subs: Piece[] = [];
  for (let n = from; n <= to; n++) {
    subs.push(makePlayer(team, `${team}-s${n}`, `S${n}`));
  }
  return subs;
}

export function createInitialBoard(): BoardState {
  const teamPieces = (team: Team): Piece[] =>
    STARTER_LABELS.map((label, i) => makePlayer(team, `${team}-${i + 1}`, label));
  return {
    pieces: [
      ...teamPieces('mine'),
      ...teamPieces('opponent'),
      {
        id: 'ball',
        type: 'ball',
        team: 'mine',
        label: '',
        fill: { kind: 'solid', color: TEAM_COLORS.ball },
      },
    ],
    squad: { mine: 11, opponent: 11 },
    keeper: { mine: false, opponent: false },
  };
}

export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case 'PLACE_PIECE':
      return {
        ...state,
        pieces: state.pieces.map((p) =>
          p.id === action.id ? { ...p, position: action.position } : p,
        ),
      };

    case 'BENCH_PIECE':
      return {
        ...state,
        pieces: state.pieces.map((p) => {
          if (p.id !== action.id) return p;
          const { position: _position, ...benched } = p;
          return benched;
        }),
      };

    case 'SET_SQUAD': {
      const targetSubs = action.size - 11;
      const subs = state.pieces.filter((p) => p.team === action.team && subNumber(p) !== null);

      if (subs.length < targetSubs) {
        const highest = Math.max(0, ...subs.map((p) => subNumber(p)!));
        const added = makeSubs(action.team, highest + 1, highest + (targetSubs - subs.length));
        return {
          ...state,
          pieces: [...state.pieces, ...added],
          squad: { ...state.squad, [action.team]: action.size },
        };
      }

      // Shrink: remove highest-numbered subs first, benched subs before placed ones.
      const removable = [...subs].sort((a, b) => {
        const aBenched = a.position === undefined ? 0 : 1;
        const bBenched = b.position === undefined ? 0 : 1;
        if (aBenched !== bBenched) return aBenched - bBenched;
        return subNumber(b)! - subNumber(a)!;
      });
      const removeIds = new Set(removable.slice(0, subs.length - targetSubs).map((p) => p.id));
      return {
        ...state,
        pieces: state.pieces.filter((p) => !removeIds.has(p.id)),
        squad: { ...state.squad, [action.team]: action.size },
      };
    }

    case 'SET_KEEPER': {
      if (state.keeper[action.team] === action.on) return state;
      if (!action.on) {
        return {
          ...state,
          pieces: state.pieces.filter((p) => !(p.team === action.team && p.isKeeper)),
          keeper: { ...state.keeper, [action.team]: false },
        };
      }
      return {
        ...state,
        pieces: [...state.pieces, makePlayer(action.team, `${action.team}-gk`, 'GK', true)],
        keeper: { ...state.keeper, [action.team]: true },
      };
    }
  }
}
