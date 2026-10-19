import { useStore, type StoreApi } from 'zustand';
import { FM26_DATA } from '../../../data/fm26';
import { pieceLabel } from '../../../state/bench-pieces';
import { placedPlayers, type PitchDocument } from '../../../state/document';
import type { PitchStore } from '../../../state/store';
import {
  SETUP_ROLES,
  SETUP_ROLES_HINT,
  SETUP_ROLES_PHONE_HINT,
  SETUP_STEP_FORMATIONS,
  SETUP_STEP_WHO_ATTACKS,
  TOKEN_TEAM_LABELS,
  setupAttacksSummary,
  setupRoleChoiceLabel,
  setupRolesSummary,
} from '../../copy';
import { SegmentedControl } from '../../controls/SegmentedControl';
import { ChoiceGrid } from '../ChoiceGrid';
import {
  FORMATION_OPTIONS,
  formationSummary,
  roleOptions,
  setupComplete,
  setupCursor,
  stepMark,
  type SetupCursor,
} from '../setup-model';
import { SetupStepper, type SetupStep } from '../SetupStepper';
import styles from './setup-flow.module.scss';

export interface SetupFlowProps {
  store: StoreApi<PitchStore>;
  phone?: boolean;
}

function rolesStep(
  store: StoreApi<PitchStore>,
  doc: PitchDocument,
  phone: boolean,
): Pick<SetupStep, 'content' | 'summary'> {
  const placed = placedPlayers(doc);
  return {
    summary: setupComplete(doc) ? setupRolesSummary(placed.length) : undefined,
    content: (
      <>
        <p className={styles['roles-hint']}>{phone ? SETUP_ROLES_PHONE_HINT : SETUP_ROLES_HINT}</p>
        {placed.map((player) => {
          const options = roleOptions(doc, player);
          if (!player.slot || options.length === 0) return null;
          return (
            <label key={player.id} className={styles['role-choice']}>
              <span>{pieceLabel(doc, player, FM26_DATA)}</span>
              <select
                aria-label={setupRoleChoiceLabel(
                  pieceLabel(doc, player, FM26_DATA),
                  TOKEN_TEAM_LABELS[player.team],
                )}
                value={player.role ?? ''}
                onChange={(event) =>
                  store.getState().dispatch({
                    type: 'setRole',
                    playerId: player.id,
                    roleId: event.target.value,
                  })
                }
              >
                {options.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </>
    ),
  };
}

function buildSteps(
  store: StoreApi<PitchStore>,
  doc: PitchDocument,
  cursor: SetupCursor,
  phone: boolean,
): SetupStep[] {
  const complete = setupComplete(doc);
  const marks = ([1, 2, 3] as const).map((index) => stepMark(index, cursor, complete));
  return [
    {
      title: SETUP_STEP_FORMATIONS,
      state: marks[0].state,
      reopened: marks[0].reopened,
      summary: formationSummary(doc),
      content: (
        <>
          <ChoiceGrid
            label={doc.teams.mine.name}
            mark="mine"
            options={FORMATION_OPTIONS}
            value={doc.teams.mine.formationId ?? undefined}
            onChange={(formationId) =>
              store.getState().dispatch({ type: 'applyFormation', team: 'mine', formationId })
            }
          />
          <ChoiceGrid
            label={doc.teams.opponent.name}
            mark="opp"
            options={FORMATION_OPTIONS}
            value={doc.teams.opponent.formationId ?? undefined}
            onChange={(formationId) =>
              store.getState().dispatch({ type: 'applyFormation', team: 'opponent', formationId })
            }
          />
        </>
      ),
    },
    {
      title: SETUP_STEP_WHO_ATTACKS,
      state: marks[1].state,
      reopened: marks[1].reopened,
      summary: setupAttacksSummary(doc.teams[doc.attacker].name),
      content: (
        <SegmentedControl
          label={SETUP_STEP_WHO_ATTACKS}
          value={doc.attacker}
          options={[
            { value: 'mine', label: doc.teams.mine.name },
            { value: 'opponent', label: doc.teams.opponent.name },
          ]}
          onChange={(value) => {
            if (value === 'mine' || value === 'opponent') {
              store.getState().dispatch({ type: 'setAttacker', attacker: value });
            }
          }}
        />
      ),
    },
    {
      title: SETUP_ROLES,
      state: marks[2].state,
      reopened: marks[2].reopened,
      ...rolesStep(store, doc, phone),
    },
  ];
}

function advance(store: StoreApi<PitchStore>, index: number) {
  const state = store.getState();
  const finished = setupComplete(state.doc);
  const open = state.ui.setupStep ?? (finished ? null : 1);
  if ((finished && open !== null) || index === 2) {
    state.patchUi({ setupStep: null });
    return;
  }
  if (index === 1) {
    state.dispatch({ type: 'fillDefaultRoles' });
    state.patchUi({ setupStep: 3 });
    return;
  }
  state.patchUi({ setupStep: 2 });
}

export function SetupFlow({ store, phone = false }: SetupFlowProps) {
  const doc = useStore(store, (state) => state.doc);
  const setupStep = useStore(store, (state) => state.ui.setupStep);
  const cursor = setupCursor(doc, setupStep);
  return (
    <div className={styles.flow}>
      <SetupStepper
        steps={buildSteps(store, doc, cursor, phone)}
        phone={phone}
        onBack={(index) => {
          if (index === 1 || index === 2) store.getState().patchUi({ setupStep: index });
        }}
        onNext={(index) => advance(store, index)}
        onEdit={(index) => {
          const step = index + 1;
          if (step === 1 || step === 2 || step === 3) {
            store.getState().patchUi({ setupStep: step });
          }
        }}
      />
    </div>
  );
}
