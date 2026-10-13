import { useId } from 'react';
import styles from './text-field.module.scss';

export interface TextFieldProps {
  label: string;
  hideLabel?: boolean;
  value?: string;
  placeholder?: string;
  maxLength?: number;
  counter?: boolean;
  hint?: string;
  error?: string;
  variant?: 'team';
  width?: number;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}

export const DEFAULT_MAX_LENGTH = 24;

export function TextField({
  label,
  hideLabel = false,
  value = '',
  placeholder,
  maxLength = DEFAULT_MAX_LENGTH,
  counter,
  hint,
  error,
  variant,
  width,
  readOnly,
  onChange,
}: TextFieldProps) {
  const inputId = useId();
  const messageId = useId();
  const effectiveReadOnly = readOnly || onChange === undefined;
  const showCounter = counter ?? variant !== 'team';
  const atCap = value.length >= maxLength;
  const message =
    error ?? (atCap && !effectiveReadOnly ? `${maxLength} characters at most.` : hint);
  const invalid = Boolean(error) || (atCap && !effectiveReadOnly);

  return (
    <div className={styles.field} data-variant={variant} data-invalid={invalid} style={{ width }}>
      <label htmlFor={inputId} className={styles.label} data-hidden={hideLabel}>
        {label}
      </label>
      <span className={styles.box}>
        <input
          id={inputId}
          className={styles.input}
          value={value}
          placeholder={placeholder}
          maxLength={maxLength}
          readOnly={effectiveReadOnly}
          aria-invalid={invalid || undefined}
          aria-describedby={message ? messageId : undefined}
          onChange={(event) => onChange?.(event.target.value)}
        />
        {showCounter ? (
          <span className={styles.count} aria-hidden="true">
            {value.length}/{maxLength}
          </span>
        ) : null}
      </span>
      {message ? (
        <span id={messageId} className={styles.hint}>
          {message}
        </span>
      ) : null}
    </div>
  );
}
