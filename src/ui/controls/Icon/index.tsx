import { ICON_PATHS, type IconName, type IconShape } from './paths';
import styles from './icon.module.scss';

export { ICON_NAMES, type IconName } from './paths';

export interface IconProps {
  name: IconName;
  size?: number;
  title?: string;
  className?: string;
}

const DEFAULT_SIZE = 20;
const STROKE_WIDTH = 1.75;

function renderShape(shape: IconShape, index: number) {
  if (typeof shape === 'string') return <path key={index} d={shape} />;
  return <path key={index} d={shape.fill} fill="currentColor" stroke="none" />;
}

export function Icon({ name, size = DEFAULT_SIZE, title, className }: IconProps) {
  const shapes: IconShape[] = ICON_PATHS[name];
  return (
    <svg
      className={className ? `${styles.icon} ${className}` : styles.icon}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {shapes.map(renderShape)}
    </svg>
  );
}
