import { useId, type ReactNode } from 'react';
import { Icon, type IconName } from '../Icon';
import { Tooltip } from '../Tooltip';
import styles from './button.module.scss';

export type ButtonVariant = 'primary' | 'ink' | 'secondary' | 'ghost' | 'icon';

interface ButtonBaseProps {
  size?: 'sm' | 'lg';
  icon?: IconName;
  tooltip?: string;
  disabled?: boolean;
  disabledReason?: string;
  tipOpen?: boolean;
  tipPlacement?: 'top' | 'bottom';
  pressed?: boolean;
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
}

export type ButtonProps = ButtonBaseProps &
  (
    | { variant: 'icon'; label: string }
    | { variant?: Exclude<ButtonVariant, 'icon'>; label?: string }
  );

const DEFAULT_ICON_SIZE = 20;
const LARGE_ICON_SIZE = 24;

export function Button(props: ButtonProps) {
  const {
    variant = 'secondary',
    size,
    icon,
    label,
    tooltip,
    disabled,
    disabledReason,
    tipOpen,
    tipPlacement,
    pressed,
    onClick,
    className,
    children,
  } = props;
  const reasonId = useId();
  const tooltipId = useId();
  const hasReason = Boolean(disabled && disabledReason);
  const readOnly = onClick === undefined && !hasReason;
  const tipText = hasReason
    ? disabledReason
    : (tooltip ?? (variant === 'icon' ? label : undefined));
  const describedBy = hasReason ? reasonId : tooltip && tooltip !== label ? tooltipId : undefined;

  const button = (
    <button
      type="button"
      className={className ? `${styles.button} ${className}` : styles.button}
      data-variant={variant}
      data-size={size}
      aria-label={label}
      aria-pressed={pressed}
      aria-disabled={hasReason || readOnly ? true : undefined}
      aria-describedby={describedBy}
      disabled={disabled && !hasReason ? true : undefined}
      tabIndex={readOnly ? -1 : undefined}
      onClick={disabled || readOnly ? undefined : onClick}
    >
      {icon ? (
        <Icon name={icon} size={size === 'lg' ? LARGE_ICON_SIZE : DEFAULT_ICON_SIZE} />
      ) : null}
      {variant === 'icon' ? null : children}
    </button>
  );

  if (!tipText || (disabled && !hasReason)) return button;

  return (
    <Tooltip
      id={hasReason ? reasonId : tooltipId}
      label={tipText}
      open={tipOpen}
      placement={tipPlacement}
      openOnTap={hasReason}
    >
      {button}
    </Tooltip>
  );
}
