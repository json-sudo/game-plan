import { useId, useRef, type KeyboardEvent } from 'react';
import { Button } from '../../controls/Button';
import { Icon, type IconName } from '../../controls/Icon';
import { useModalDialog } from '../../hooks/useModalDialog';
import styles from './phone-menu.module.scss';

export interface PhoneMenuItem {
  icon: IconName;
  label: string;
  disabled?: boolean;
  note?: string;
  onSelect?: () => void;
}

export type PhoneMenuEntry = PhoneMenuItem | 'sep';

export interface PhoneMenuProps {
  items: PhoneMenuEntry[];
  title?: string;
  onClose?: () => void;
  inline?: boolean;
}

const DEFAULT_TITLE = 'More';

function MenuItems({ items }: { items: PhoneMenuEntry[] }) {
  const noteBase = useId();
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const actionable = items.filter((entry): entry is PhoneMenuItem => entry !== 'sep');

  const move = (event: KeyboardEvent, index: number) => {
    const last = actionable.length - 1;
    const targets: Record<string, number> = {
      ArrowDown: index === last ? 0 : index + 1,
      ArrowUp: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    };
    const target = targets[event.key];
    if (target === undefined) return;
    event.preventDefault();
    itemRefs.current[target]?.focus();
  };

  let itemIndex = -1;
  return items.map((entry, position) => {
    if (entry === 'sep') return <div key={`sep-${position}`} className={styles.separator} />;
    itemIndex += 1;
    const index = itemIndex;
    const noteId = `${noteBase}-${index}`;
    return (
      <button
        key={entry.label}
        ref={(node) => {
          itemRefs.current[index] = node;
        }}
        type="button"
        role="menuitem"
        className={styles.item}
        tabIndex={index === 0 ? 0 : -1}
        aria-disabled={entry.disabled || undefined}
        aria-describedby={entry.note ? noteId : undefined}
        onClick={entry.disabled ? undefined : entry.onSelect}
        onKeyDown={(event) => move(event, index)}
      >
        <Icon name={entry.icon} />
        {entry.label}
        {entry.note ? (
          <span id={noteId} className={styles.note}>
            {entry.note}
          </span>
        ) : null}
      </button>
    );
  });
}

function Sheet({ items, title = DEFAULT_TITLE, onClose }: PhoneMenuProps) {
  const titleId = useId();
  return (
    <div className={styles.sheet}>
      <div className={styles.handle} />
      <div className={styles.head}>
        <span id={titleId} className={styles.title}>
          {title}
        </span>
        <Button variant="icon" icon="close" label="Close menu" onClick={onClose} />
      </div>
      <div role="menu" aria-labelledby={titleId}>
        <MenuItems items={items} />
      </div>
    </div>
  );
}

function ModalSheet(props: PhoneMenuProps) {
  const dialogRef = useModalDialog(props.onClose);
  return (
    <dialog
      ref={dialogRef}
      className={styles.modal}
      aria-label={props.title ?? DEFAULT_TITLE}
      data-phone="true"
    >
      <Sheet {...props} />
    </dialog>
  );
}

export function PhoneMenu(props: PhoneMenuProps) {
  return props.inline ? (
    <div data-phone="true">
      <Sheet {...props} />
    </div>
  ) : (
    <ModalSheet {...props} />
  );
}
