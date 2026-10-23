import { useLayoutEffect, useRef, useState } from 'react';
import { useStore, type StoreApi } from 'zustand';
import { FM26_DATA } from '../../../data/fm26';
import type { Side } from '../../../data/types';
import { pieceLabel } from '../../../state/bench-pieces';
import {
  placedPlayers,
  playerSide,
  possessionOf,
  type PitchDocument,
  type Player,
} from '../../../state/document';
import type { PitchStore } from '../../../state/store';
import {
  ROLE_LIST_HEADINGS,
  SETUP_ROLES_HINT,
  SETUP_ROLES_PHONE_HINT,
  SETUP_ROLES_RECOMPUTE_NOTE,
} from '../../copy';
import { pickerRoles } from '../../roles/picker-roles';
import { RoleList, type RoleListRow } from '../../roles/RoleList';
import { RolePicker } from '../../roles/RolePicker';
import { isRoleChanged } from '../setup-model';
import styles from './roles-step.module.scss';

const PICKER_GAP_PX = 16;

export interface RolesStepProps {
  store: StoreApi<PitchStore>;
  phone?: boolean;
}

function roleName(roleId: string | undefined) {
  return FM26_DATA.roles.find((role) => role.id === roleId)?.name ?? '';
}

function rowOf(doc: PitchDocument, player: Player): RoleListRow {
  return {
    id: player.id,
    label: pieceLabel(doc, player, FM26_DATA),
    role: roleName(player.role),
    changed: isRoleChanged(doc, player),
  };
}

export function RolesStep({ store, phone = false }: RolesStepProps) {
  const doc = useStore(store, (state) => state.doc);
  const [shown, setShown] = useState<Side>('mine');
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [place, setPlace] = useState({ left: 0, top: 0 });
  const stepRef = useRef<HTMLDivElement>(null);
  const hasOpponent = doc.teams.opponent.formationId !== null;
  const team = hasOpponent ? shown : 'mine';
  const players = placedPlayers(doc).filter(
    (player) => player.team === team && player.slot !== null && player.role !== undefined,
  );
  const picked = players.find((player) => player.id === pickedId);
  const heading = ROLE_LIST_HEADINGS[possessionOf(doc, team)];

  useLayoutEffect(() => {
    const rect = stepRef.current?.getBoundingClientRect();
    if (picked && rect) setPlace({ left: rect.right + PICKER_GAP_PX, top: rect.top });
  }, [picked]);

  return (
    <div ref={stepRef} className={styles.step}>
      <p className={styles.hint}>{phone ? SETUP_ROLES_PHONE_HINT : SETUP_ROLES_HINT}</p>
      {doc.scenario ? <p className={styles.hint}>{SETUP_ROLES_RECOMPUTE_NOTE}</p> : null}
      <RoleList
        heading={heading}
        rows={players.map((player) => rowOf(doc, player))}
        team={team}
        teamNames={{ mine: doc.teams.mine.name, opponent: doc.teams.opponent.name }}
        showTeamSwitch={hasOpponent}
        selected={picked?.id}
        readOnly={phone}
        onTeam={(next) => {
          setShown(next);
          setPickedId(null);
        }}
        onSelect={setPickedId}
      />
      {picked?.role ? (
        <div className={styles.picker} style={place}>
          <RolePicker
            slotLabel={pieceLabel(doc, picked, FM26_DATA)}
            side={playerSide(picked)}
            phase={possessionOf(doc, picked.team) === 'in' ? 'IP' : 'OOP'}
            team={picked.team}
            roles={pickerRoles(doc, picked)}
            current={picked.role}
            value={picked.role}
            zone={doc.scenario?.zone}
            onChoose={(roleId) =>
              store.getState().dispatch({ type: 'setRole', playerId: picked.id, roleId })
            }
            onClose={() => setPickedId(null)}
          />
        </div>
      ) : null}
    </div>
  );
}
