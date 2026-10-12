import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import styles from './tooltip.module.scss';

export interface TooltipProps {
  label: ReactNode;
  open?: boolean;
  placement?: 'top' | 'bottom';
  id?: string;
  openOnTap?: boolean;
  children: ReactNode;
}

export function Tooltip({
  label,
  open = false,
  placement = 'bottom',
  id,
  openOnTap = true,
  children,
}: TooltipProps) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const touchRef = useRef(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!pinned) return;
    const closeOnOutsidePress = (event: globalThis.PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setPinned(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePress);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePress);
  }, [pinned]);

  const dismiss = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    setPinned(false);
    setDismissed(true);
  };

  const trackPointer = (event: PointerEvent) => {
    touchRef.current = event.pointerType === 'touch';
  };

  const tapOpen = () => {
    if (openOnTap && touchRef.current) setPinned(true);
  };

  const visible = open || pinned || ((hovered || focused) && !dismissed);

  return (
    <span
      ref={wrapRef}
      role="presentation"
      className={styles.wrap}
      data-placement={placement}
      data-visible={visible}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setDismissed(false);
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        setPinned(false);
        setDismissed(false);
      }}
      onKeyDown={dismiss}
      onPointerDown={trackPointer}
      onClick={tapOpen}
    >
      {children}
      <span className={styles.tip} role="tooltip" id={id}>
        {label}
      </span>
    </span>
  );
}
