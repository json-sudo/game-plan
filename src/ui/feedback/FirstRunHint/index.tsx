import { Button } from '../../controls/Button';
import { PHONE_MAX_WIDTH } from '../../../shared/constants/breakpoints';
import { useBelowBreakpoint } from '../../../shared/hooks/useBelowBreakpoint';
import styles from './first-run-hint.module.scss';

export interface FirstRunHintProps {
  title?: string;
  example?: string;
  onDismiss?: () => void;
}

const DEFAULT_TITLE = 'See where every role goes';
const DEFAULT_EXAMPLE = '4-3-3 DM Wide vs 4-2-3-1 DM Wide';
const STEPS = ['Tap a zone on the map.', 'Press Play.'];
const DESKTOP_LAST_STEP = 'Step through with Next, or tap a player to change its role.';
const PHONE_LAST_STEP = 'Step through with Next, or tap a player to see its role.';

export function FirstRunHint({
  title = DEFAULT_TITLE,
  example = DEFAULT_EXAMPLE,
  onDismiss,
}: FirstRunHintProps) {
  const phone = useBelowBreakpoint(PHONE_MAX_WIDTH);

  return (
    <aside className={styles.hint} aria-label="How to use the example">
      <div className={styles.title}>{title}</div>
      <ol className={styles.steps}>
        {[...STEPS, phone ? PHONE_LAST_STEP : DESKTOP_LAST_STEP].map((step) => (
          <li key={step} className={styles.step}>
            {step}
          </li>
        ))}
      </ol>
      <div className={styles.foot}>
        <span className={styles.example}>{example}</span>
        {onDismiss ? (
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Got it
          </Button>
        ) : null}
      </div>
    </aside>
  );
}
