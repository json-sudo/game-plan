import type { BoardState, Piece, SquadSize, Team } from './types';
import {
  getFormation,
  matchupAttackerPlacement,
  separateFromDefenders,
  standardPlacement,
  type FormationSlot,
} from './formations';

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
  | { type: 'SET_KEEPER'; team: Team; on: boolean }
  | { type: 'APPLY_FORMATION'; team: Team; name: string }
  | { type: 'APPLY_MATCHUP'; attacker: Team; formations: { mine: string; opponent: string } }
  | { type: 'CLEAR_PITCH' }
  | { type: 'RESET_BOARD' };

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

type Assignments = Map<string, { position: { x: number; y: number }; label: string }>;

function formationAssignments(
  state: BoardState,
  team: Team,
  name: string,
  place: (slot: FormationSlot, isKeeper: boolean) => { x: number; y: number },
): Assignments | null {
  const formation = getFormation(name);
  if (!formation) return null;

  const gkSlot = formation.slots.find((s) => s.label === 'GK')!;
  const outfieldSlots = formation.slots.filter((s) => s !== gkSlot);
  const starters = state.pieces.filter(
    (p) => p.team === team && p.type === 'player' && !p.isKeeper && subNumber(p) === null,
  );
  const assignments: Assignments = new Map();
  starters.forEach((piece, i) => {
    const slot = outfieldSlots[i];
    if (slot) assignments.set(piece.id, { position: place(slot, false), label: slot.label });
  });
  const keeper = state.pieces.find((p) => p.team === team && p.isKeeper);
  if (keeper) assignments.set(keeper.id, { position: place(gkSlot, true), label: 'GK' });
  return assignments;
}

function applyAssignments(pieces: Piece[], assignments: Assignments): Piece[] {
  return pieces.map((p) => {
    const a = assignments.get(p.id);
    return a ? { ...p, position: a.position, label: a.label } : p;
  });
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

    case 'APPLY_FORMATION': {
      const assignments = formationAssignments(state, action.team, action.name, (slot) =>
        standardPlacement(slot, action.team),
      );
      if (!assignments) return state;
      return {
        ...state,
        pieces: applyAssignments(state.pieces, assignments),
        formation: { ...state.formation, [action.team]: action.name },
      };
    }

    case 'APPLY_MATCHUP': {
      const defender: Team = action.attacker === 'mine' ? 'opponent' : 'mine';
      const defending = formationAssignments(state, defender, action.formations[defender], (slot) =>
        standardPlacement(slot, defender),
      );
      const attacking = formationAssignments(
        state,
        action.attacker,
        action.formations[action.attacker],
        (slot, isKeeper) => matchupAttackerPlacement(slot, action.attacker, isKeeper),
      );
      if (!defending || !attacking) return state;

      const defenderPoints = [...defending].map(([id, a]) => ({
        id,
        x: a.position.x,
        y: a.position.y,
      }));
      const attackerPoints = [...attacking]
        .filter(([, a]) => a.label !== 'GK')
        .map(([id, a]) => ({ id, x: a.position.x, y: a.position.y }));
      const separated = separateFromDefenders(
        attackerPoints,
        defenderPoints,
        action.attacker === 'mine',
      );
      const resolvedAttacking: Assignments = new Map(
        [...attacking].map(([id, a]) => [id, { ...a, position: separated.get(id) ?? a.position }]),
      );

      return {
        ...state,
        pieces: applyAssignments(state.pieces, new Map([...defending, ...resolvedAttacking])),
        formation: { mine: action.formations.mine, opponent: action.formations.opponent },
      };
    }

    case 'CLEAR_PITCH': {
      if (!state.pieces.some((p) => p.position !== undefined)) return state;
      return {
        ...state,
        pieces: state.pieces.map((p) => {
          if (p.position === undefined) return p;
          const { position: _position, ...benched } = p;
          return benched;
        }),
      };
    }

    case 'RESET_BOARD':
      return createInitialBoard();

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
