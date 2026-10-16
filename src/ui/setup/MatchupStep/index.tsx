import { useState } from 'react';
import { useStore, type StoreApi } from 'zustand';
import type { PitchStore } from '../../../state/store';
import { MATCHUP_APPLY_LABEL, MATCHUP_HEADING, OPEN_PITCH_HINT } from '../../copy';
import { Button } from '../../controls/Button';
import { ChoiceGrid } from '../ChoiceGrid';
import { FORMATION_OPTIONS } from '../setup-model';
import styles from './matchup-step.module.scss';

export interface MatchupStepProps {
  store: StoreApi<PitchStore>;
}

interface Pending {
  mine?: string;
  opponent?: string;
}

export function MatchupStep({ store }: MatchupStepProps) {
  const doc = useStore(store, (state) => state.doc);
  const [pending, setPending] = useState<Pending>({});
  const mine = pending.mine ?? doc.teams.mine.formationId ?? undefined;
  const opponent = pending.opponent ?? doc.teams.opponent.formationId ?? undefined;
  const ready = Boolean(mine && opponent);

  return (
    <section className={styles.step} aria-label={MATCHUP_HEADING}>
      <h3 className={styles.heading}>{MATCHUP_HEADING}</h3>
      <ChoiceGrid
        label={doc.teams.mine.name}
        mark="mine"
        options={FORMATION_OPTIONS}
        value={mine}
        onChange={(formationId) => setPending({ ...pending, mine: formationId })}
      />
      <ChoiceGrid
        label={doc.teams.opponent.name}
        mark="opp"
        options={FORMATION_OPTIONS}
        value={opponent}
        onChange={(formationId) => setPending({ ...pending, opponent: formationId })}
      />
      <p className={styles.hint}>{OPEN_PITCH_HINT}</p>
      <Button
        variant="primary"
        disabled={!ready}
        onClick={() => {
          if (!mine || !opponent) return;
          store.getState().dispatch({ type: 'applyMatchupChoice', mine, opponent });
        }}
      >
        {MATCHUP_APPLY_LABEL}
      </Button>
    </section>
  );
}
