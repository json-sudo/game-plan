import type { ReactNode } from 'react';
import { Button } from '../../controls/Button';
import { Icon } from '../../controls/Icon';
import { SETUP_SHEET_CANCEL, SETUP_SHEET_CLOSE, SETUP_SHEET_LABEL } from '../../copy';
import styles from './setup-stepper.module.scss';

export type StepState = 'todo' | 'active' | 'done';

export interface SetupStep {
  title: string;
  state?: StepState;
  summary?: string;
  content?: ReactNode;
  reopened?: boolean;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextReason?: string;
}

export interface SetupStepperProps {
  steps: SetupStep[];
  sheet?: boolean;
  onClose?: () => void;
  onBack?: (index: number) => void;
  onNext?: (index: number) => void;
  onEdit?: (index: number) => void;
}

function forwardLabel(step: SetupStep, index: number, total: number): string {
  if (step.nextLabel) return step.nextLabel;
  if (step.reopened) return 'Save';
  return index === total - 1 ? 'Done' : 'Next';
}

function SheetStepper({ steps, onClose, onBack, onNext, onEdit }: SetupStepperProps) {
  const total = steps.length;
  const active = Math.max(
    steps.findIndex((step) => step.state === 'active'),
    0,
  );
  const current = steps[active];

  return (
    <section className={styles.sheet} aria-label={SETUP_SHEET_LABEL}>
      <header className={styles['sheet-head']}>
        <div>
          <div className={styles.eyebrow}>
            Step {active + 1} of {total}
          </div>
          <h2 className={styles['sheet-title']}>{current.title}</h2>
        </div>
        <Button variant="icon" icon="close" label={SETUP_SHEET_CLOSE} onClick={onClose} />
      </header>
      <div
        className={styles.progress}
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={active + 1}
        aria-label="Setup progress"
      >
        {steps.map((step, index) => (
          <span key={step.title} className={styles.segment} data-filled={index <= active} />
        ))}
      </div>
      <div className={styles['sheet-body']}>
        {steps.slice(0, active).map((step, index) => (
          <div key={step.title} className={styles.row}>
            <span className={styles.number} aria-hidden="true">
              <Icon name="check" size={16} />
            </span>
            <div className={styles.text}>
              <div className={styles.title}>{step.title}</div>
              {step.summary ? <div className={styles.summary}>{step.summary}</div> : null}
            </div>
            {onEdit ? (
              <Button
                variant="ghost"
                size="sm"
                icon="edit"
                label={`Edit ${step.title}`}
                onClick={() => onEdit(index)}
              >
                Edit
              </Button>
            ) : null}
          </div>
        ))}
        {current.content}
        {current.nextDisabled && current.nextReason ? (
          <p className={styles.reason}>{current.nextReason}</p>
        ) : null}
      </div>
      <div className={styles['sheet-nav']}>
        {active === 0 ? (
          <Button variant="ghost" onClick={onClose}>
            {SETUP_SHEET_CANCEL}
          </Button>
        ) : (
          <Button variant="ghost" onClick={onBack ? () => onBack(active) : undefined}>
            Back
          </Button>
        )}
        <Button
          variant="primary"
          disabled={current.nextDisabled}
          disabledReason={current.nextReason}
          onClick={onNext ? () => onNext(active) : undefined}
        >
          {forwardLabel(current, active, total)}
        </Button>
      </div>
    </section>
  );
}

export function SetupStepper(props: SetupStepperProps) {
  if (props.sheet) return <SheetStepper {...props} />;
  const { steps, onBack, onNext, onEdit } = props;
  const total = steps.length;
  const buttonSize = 'sm';

  return (
    <section className={styles.stepper} aria-label={SETUP_SHEET_LABEL}>
      <ol className={styles.steps}>
        {steps.map((step, index) => {
          const state = step.state ?? 'todo';
          return (
            <li
              key={step.title}
              className={styles.step}
              data-state={state}
              data-reopened={step.reopened || undefined}
              aria-current={state === 'active' ? 'step' : undefined}
            >
              <div className={styles.head}>
                <span className={styles.number} aria-hidden="true">
                  {state === 'done' ? <Icon name="check" size={16} /> : index + 1}
                </span>
                <div className={styles.text}>
                  <div className={styles.eyebrow}>
                    Step {index + 1} of {total}
                    {state === 'done' ? ' · Done' : ''}
                  </div>
                  <div className={styles.title}>{step.title}</div>
                  {step.summary && state === 'done' ? (
                    <div className={styles.summary}>{step.summary}</div>
                  ) : null}
                </div>
                {state === 'done' && onEdit ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="edit"
                    label={`Edit ${step.title}`}
                    onClick={() => onEdit(index)}
                  >
                    Edit
                  </Button>
                ) : null}
              </div>
              {state === 'active' ? (
                <div className={styles.body}>
                  {step.content}
                  {step.nextDisabled && step.nextReason ? (
                    <p className={styles.reason}>{step.nextReason}</p>
                  ) : null}
                  <div className={styles.nav}>
                    {index > 0 ? (
                      <Button
                        variant="ghost"
                        size={buttonSize}
                        onClick={onBack ? () => onBack(index) : undefined}
                      >
                        Back
                      </Button>
                    ) : (
                      <span />
                    )}
                    <Button
                      variant="primary"
                      size={buttonSize}
                      disabled={step.nextDisabled}
                      disabledReason={step.nextReason}
                      onClick={onNext ? () => onNext(index) : undefined}
                    >
                      {forwardLabel(step, index, total)}
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
