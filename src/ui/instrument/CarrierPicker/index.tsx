import { useId } from 'react';
import {
  CARRIER_PICKER_EMPTY,
  CARRIER_PICKER_HEADING,
  CARRIER_PICKER_PROMPT,
  carrierOptionLabel,
  carrierPickerZoneLine,
} from '../../copy';
import styles from './carrier-picker.module.scss';

export interface CarrierOption {
  id: string;
  label: string;
  role: string;
}

export interface CarrierPickerProps {
  zone: string;
  options: readonly CarrierOption[];
  value?: string | null;
  onChoose?: (playerId: string) => void;
}

export function CarrierPicker({ zone, options, value = null, onChoose }: CarrierPickerProps) {
  const groupName = useId();
  const empty = options.length === 0;

  return (
    <fieldset className={styles.picker}>
      <legend className={styles.heading}>{CARRIER_PICKER_HEADING}</legend>
      <p className={styles.zone}>{carrierPickerZoneLine(zone)}</p>
      {empty ? (
        <p className={styles.note} role="status">
          {CARRIER_PICKER_EMPTY}
        </p>
      ) : (
        <>
          <div className={styles.list}>
            {options.map((option) => (
              <label key={option.id} className={styles.option}>
                <input
                  type="radio"
                  className={styles.radio}
                  name={groupName}
                  value={option.id}
                  checked={option.id === value}
                  aria-label={carrierOptionLabel(option.label, option.role)}
                  onChange={() => onChoose?.(option.id)}
                />
                <span className={styles.position}>{option.label}</span>
                <span className={styles.role}>{option.role}</span>
              </label>
            ))}
          </div>
          {value === null ? <p className={styles.note}>{CARRIER_PICKER_PROMPT}</p> : null}
        </>
      )}
    </fieldset>
  );
}
