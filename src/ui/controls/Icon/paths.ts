export type IconShape = string | { fill: string };

export const ICON_PATHS = {
  undo: ['M9 5L4 10l5 5', 'M4 10h10a5 5 0 0 1 0 10h-4'],
  redo: ['M15 5l5 5-5 5', 'M20 10H10a5 5 0 0 0 0 10h4'],
  play: [{ fill: 'M7 4.5v15l12.5-7.5z' }],
  pause: ['M8 5v14', 'M16 5v14'],
  back: ['M6 5v14', { fill: 'M19 5v14L8 12z' }],
  next: ['M18 5v14', { fill: 'M5 5v14l11-7z' }],
  share: ['M12 3v12', 'M7 8l5-5 5 5', 'M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6'],
  save: ['M5 3h11l3 3v15H5z', 'M8 3v5h7V3', 'M8 21v-7h8v7'],
  load: ['M3 6h6l2 2h10v11H3z'],
  image: ['M3 5h18v14H3z', 'M3 16l5-5 4 4 3-3 6 6', 'M15.5 8.5h.01'],
  sun: [
    'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8z',
    'M12 2v2',
    'M12 20v2',
    'M4.9 4.9l1.4 1.4',
    'M17.7 17.7l1.4 1.4',
    'M2 12h2',
    'M20 12h2',
    'M4.9 19.1l1.4-1.4',
    'M17.7 6.3l1.4-1.4',
  ],
  moon: ['M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z'],
  reset: ['M4 4v6h6', 'M4.6 10A8 8 0 1 1 6 17'],
  clear: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13'],
  copy: ['M8 8h12v12H8z', 'M4 16V4h12'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  menu: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
  check: ['M5 12l5 5 9-10'],
  info: ['M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z', 'M12 11v6', 'M12 7.5v.5'],
  alert: ['M12 3l10 18H2z', 'M12 10v5', 'M12 18v.5'],
  up: ['M12 19V5', 'M6 11l6-6 6 6'],
  edit: ['M4 20h4L19 9l-4-4L4 16z'],
  lock: ['M6 11h12v10H6z', 'M8 11V7a4 4 0 0 1 8 0v4'],
  link: [
    'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1',
    'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  ],
  download: ['M12 4v11', 'M7 10l5 5 5-5', 'M5 20h14'],
  chevron: ['M9 6l6 6-6 6'],
  bench: ['M4 10h16', 'M6 10v8', 'M18 10v8', 'M4 14h16'],
} satisfies Record<string, IconShape[]>;

export type IconName = keyof typeof ICON_PATHS;

export const ICON_NAMES = Object.keys(ICON_PATHS) as IconName[];
