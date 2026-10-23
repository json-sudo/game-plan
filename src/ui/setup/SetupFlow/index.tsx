import { useStore, type StoreApi } from 'zustand';
import { isSetupComplete, placedPlayers, type PitchDocument } from '../../../state/document';
import type { PitchStore } from '../../../state/store';
import {
  SETUP_ATTACKS_HINT,
  SETUP_FORMATION_NEXT_REASON,
  SETUP_OPPONENT_LABEL,
  SETUP_ROLES,
  SETUP_STEP_FORMATIONS,
  SETUP_STEP_WHO_ATTACKS,
  setupAttacksSummary,
  setupRolesSummary,
} from '../../copy';
import { SegmentedControl } from '../../controls/SegmentedControl';
import { ChoiceGrid } from '../ChoiceGrid';
import { RolesStep } from '../RolesStep';
import {
  FORMATION_CARDS,
  FORMATION_MORE,
  NO_OPPONENT_VALUE,
  OPPONENT_CARDS,
  formationSummary,
  isRoleChanged,
  setupCursor,
  setupStepNumbers,
  stepMark,
  type SetupCursor,
} from '../setup-model';
import { SetupStepper, type SetupStep } from '../SetupStepper';
import styles from './setup-flow.module.scss';

export interface SetupFlowProps {
  store: StoreApi<PitchStore>;
  phone?: boolean;
  onClose?: () => void;
}

function rolesSummary(doc: PitchDocument) {
  const placed = placedPlayers(doc);
  return setupRolesSummary(placed.length, placed.filter((p) => isRoleChanged(doc, p)).length);
}

function buildSteps(
  store: StoreApi<PitchStore>,
  doc: PitchDocument,
  cursor: SetupCursor,
  phone: boolean,
): SetupStep[] {
  const complete = isSetupComplete(doc);
  const marks = ([1, 2, 3] as const).map((index) => stepMark(index, cursor, complete));
  const dispatch = store.getState().dispatch;
  const steps: SetupStep[] = [
    {
      title: SETUP_STEP_FORMATIONS,
      state: marks[0].state,
      reopened: marks[0].reopened,
      summary: formationSummary(doc),
      nextDisabled: doc.teams.mine.formationId === null,
      nextReason: SETUP_FORMATION_NEXT_REASON,
      content: (
        <>
          <ChoiceGrid
            label={doc.teams.mine.name}
            mark="mine"
            options={FORMATION_CARDS}
            moreOptions={FORMATION_MORE}
            value={doc.teams.mine.formationId ?? undefined}
            onChange={(formationId) =>
              dispatch({ type: 'applyFormation', team: 'mine', formationId })
            }
          />
          <ChoiceGrid
            label={SETUP_OPPONENT_LABEL}
            mark="opp"
            options={OPPONENT_CARDS}
            moreOptions={FORMATION_MORE}
            value={doc.teams.opponent.formationId ?? NO_OPPONENT_VALUE}
            onChange={(formationId) =>
              dispatch(
                formationId === NO_OPPONENT_VALUE
                  ? { type: 'clearOpponent' }
                  : { type: 'applyFormation', team: 'opponent', formationId },
              )
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
        <>
          <p className={styles.hint}>{SETUP_ATTACKS_HINT}</p>
          <SegmentedControl
            label={SETUP_STEP_WHO_ATTACKS}
            value={doc.attacker}
            options={[
              { value: 'mine', label: doc.teams.mine.name },
              { value: 'opponent', label: doc.teams.opponent.name },
            ]}
            onChange={(value) => {
              if (value === 'mine' || value === 'opponent') {
                dispatch({ type: 'setAttacker', attacker: value });
              }
            }}
          />
        </>
      ),
    },
    {
      title: SETUP_ROLES,
      state: marks[2].state,
      reopened: marks[2].reopened,
      summary: complete ? rolesSummary(doc) : undefined,
      content: <RolesStep store={store} phone={phone} />,
    },
  ];
  return setupStepNumbers(doc).map((number) => steps[number - 1]);
}

function advance(store: StoreApi<PitchStore>, index: number) {
  const state = store.getState();
  const numbers = setupStepNumbers(state.doc);
  const finished = isSetupComplete(state.doc);
  const open = setupCursor(state.doc, state.ui.setupStep);
  const next = numbers[index + 1];
  if ((finished && open !== null) || next === undefined) {
    state.patchUi({ setupStep: null });
    return;
  }
  if (next === 3) state.dispatch({ type: 'fillDefaultRoles' });
  state.patchUi({ setupStep: next });
}

export function SetupFlow({ store, phone = false, onClose }: SetupFlowProps) {
  const doc = useStore(store, (state) => state.doc);
  const setupStep = useStore(store, (state) => state.ui.setupStep);
  const cursor = setupCursor(doc, setupStep);
  return (
    <div className={styles.flow}>
      <SetupStepper
        steps={buildSteps(store, doc, cursor, phone)}
        sheet={phone}
        onClose={onClose}
        onBack={(index) => {
          const previous = setupStepNumbers(doc)[index - 1];
          if (previous !== undefined) store.getState().patchUi({ setupStep: previous });
        }}
        onNext={(index) => advance(store, index)}
        onEdit={(index) => {
          const step = setupStepNumbers(doc)[index];
          if (step !== undefined) store.getState().patchUi({ setupStep: step });
        }}
      />
    </div>
  );
}
