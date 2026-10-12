import { useRef, type KeyboardEvent } from 'react';

interface RovingRadioOptions {
  values: string[];
  value?: string;
  onChange?: (value: string) => void;
}

const NEXT_KEYS = ['ArrowRight', 'ArrowDown'];
const PREVIOUS_KEYS = ['ArrowLeft', 'ArrowUp'];

export function useRovingRadio({ values, value, onChange }: RovingRadioOptions) {
  const refs = useRef(new Map<string, HTMLElement>());
  const tabbable = value !== undefined && values.includes(value) ? value : values[0];

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
    onChange?.(target);
  };

  return {
    register,
    onKeyDown,
    tabIndexFor: (optionValue: string) => (optionValue === tabbable ? 0 : -1),
  };
}
