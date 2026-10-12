import { useRef, useState, type KeyboardEvent } from 'react';

interface RovingRadioOptions {
  values: string[];
  value?: string;
  onChange?: (value: string) => void;
}

const NEXT_KEYS = ['ArrowRight', 'ArrowDown'];
const PREVIOUS_KEYS = ['ArrowLeft', 'ArrowUp'];

export function useRovingRadio({ values, value, onChange }: RovingRadioOptions) {
  const refs = useRef(new Map<string, HTMLElement>());
  const [localValue, setLocalValue] = useState<string | undefined>(undefined);
  const controlled = value !== undefined;

  const selected = controlled ? value : localValue;
  const tabbable =
    controlled && values.includes(value!)
      ? value!
      : localValue !== undefined && values.includes(localValue)
        ? localValue
        : values[0];

  const select = (target: string) => {
    if (!controlled) setLocalValue(target);
    onChange?.(target);
  };

  const register = (optionValue: string) => (node: HTMLElement | null) => {
    if (node) refs.current.set(optionValue, node);
    else refs.current.delete(optionValue);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const current = values.indexOf(tabbable);
    let next = -1;
    if (NEXT_KEYS.includes(event.key)) next = (current + 1) % values.length;
    else if (PREVIOUS_KEYS.includes(event.key))
      next = (current - 1 + values.length) % values.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = values.length - 1;
    if (next < 0) return;
    event.preventDefault();
    const target = values[next];
    refs.current.get(target)?.focus();
    select(target);
  };

  return {
    register,
    onKeyDown,
    select,
    tabIndexFor: (optionValue: string) => (optionValue === tabbable ? 0 : -1),
    isSelected: (optionValue: string) => optionValue === selected,
  };
}
