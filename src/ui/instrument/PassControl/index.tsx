import { useState } from 'react';
import {
  PASS_CHOOSE_FIRST_REASON,
  PASS_HEADING,
  PASS_LABEL,
  PASS_NO_CARRIER_REASON,
  PASS_PLACEHOLDER,
  PASS_TO_LABEL,
  carrierOptionLabel,
} from '../../copy';
import { Button } from '../../controls/Button';
import type { CarrierOption } from '../CarrierPicker';
import styles from './pass-control.module.scss';

export interface PassControlProps {
  teammates: readonly CarrierOption[];
  busy?: boolean;
  onPass?: (receiverId: string) => void;
}

export function PassControl({ teammates, busy = false, onPass }: PassControlProps) {
  const [chosen, setChosen] = useState('');
  const receiverId = teammates.some((teammate) => teammate.id === chosen) ? chosen : '';
  const noCarrier = teammates.length === 0;
  const blocked = busy || noCarrier;
  const reason = noCarrier ? PASS_NO_CARRIER_REASON : PASS_CHOOSE_FIRST_REASON;

  return (
    <section className={styles.pass} aria-label={PASS_HEADING}>
      <h2 className={styles.heading}>{PASS_HEADING}</h2>
      <select
        className={styles.select}
        aria-label={PASS_TO_LABEL}
        value={receiverId}
        disabled={blocked}
        onChange={(event) => setChosen(event.target.value)}
      >
        <option value="">{PASS_PLACEHOLDER}</option>
        {teammates.map((teammate) => (
          <option key={teammate.id} value={teammate.id}>
            {carrierOptionLabel(teammate.label, teammate.role)}
          </option>
        ))}
      </select>
      <div className={styles.action}>
        <Button
          variant="secondary"
          disabled={blocked || receiverId === ''}
          disabledReason={busy ? undefined : reason}
          onClick={() => onPass?.(receiverId)}
        >
          {PASS_LABEL}
        </Button>
      </div>
    </section>
  );
}
