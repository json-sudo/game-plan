import type { ReactNode } from 'react';
import { Button } from '../../controls/Button';
import { Icon } from '../../controls/Icon';
import styles from './setup-stepper.module.scss';

export type StepState = 'todo' | 'active' | 'done';

export interface SetupStep {
  title: string;
  state?: StepState;
  summary?: string;
  content?: ReactNode;
  reopened?: boolean;
  nextLabel?: string;
}

export interface SetupStepperProps {
  steps: SetupStep[];
  phone?: boolean;
  onBack?: (index: number) => void;
  onNext?: (index: number) => void;
  onEdit?: (index: number) => void;
}

function forwardLabel(step: SetupStep, index: number, total: number): string {
  if (step.nextLabel) return step.nextLabel;
  if (step.reopened) return 'Save';
  return index === total - 1 ? 'Done' : 'Next';
}

export function SetupStepper({ steps, phone = false, onBack, onNext, onEdit }: SetupStepperProps) {
  const total = steps.length;
  const buttonSize = phone ? undefined : 'sm';

  return (
    <section className={styles.stepper} data-phone={phone} aria-label="Guided setup">
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
                  {step.summary && state !== 'active' ? (
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
