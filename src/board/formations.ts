import { PITCH_W, PITCH_H } from '../components/Pitch';

export interface FormationSlot {
  label: string;
  x: number;
  y: number;
}

export interface Formation {
  name: string;
  slots: FormationSlot[];
}

const CX = PITCH_W / 2;

export const FORMATIONS: Formation[] = [
  {
    name: '4-3-3',
    slots: [
      { label: 'GK', x: CX, y: 94 },
      { label: 'LB', x: 10, y: 80 },
      { label: 'CB', x: 28, y: 82 },
      { label: 'CB', x: 48, y: 82 },
      { label: 'RB', x: 66, y: 80 },
      { label: 'CM', x: 20, y: 67 },
      { label: 'CM', x: CX, y: 69 },
      { label: 'CM', x: 56, y: 67 },
      { label: 'LW', x: 12, y: 56 },
      { label: 'ST', x: CX, y: 54 },
      { label: 'RW', x: 64, y: 56 },
    ],
  },
  {
    name: '4-4-2',
    slots: [
      { label: 'GK', x: CX, y: 94 },
      { label: 'LB', x: 10, y: 80 },
      { label: 'CB', x: 28, y: 82 },
      { label: 'CB', x: 48, y: 82 },
      { label: 'RB', x: 66, y: 80 },
      { label: 'LM', x: 10, y: 66 },
      { label: 'CM', x: 28, y: 68 },
      { label: 'CM', x: 48, y: 68 },
      { label: 'RM', x: 66, y: 66 },
      { label: 'ST', x: 28, y: 55 },
      { label: 'ST', x: 48, y: 55 },
    ],
  },
  {
    name: '3-5-2',
    slots: [
      { label: 'GK', x: CX, y: 94 },
      { label: 'CB', x: 20, y: 82 },
      { label: 'CB', x: CX, y: 83 },
      { label: 'CB', x: 56, y: 82 },
      { label: 'LWB', x: 8, y: 68 },
      { label: 'CM', x: 24, y: 69 },
      { label: 'CM', x: CX, y: 71 },
      { label: 'CM', x: 52, y: 69 },
      { label: 'RWB', x: 68, y: 68 },
      { label: 'ST', x: 28, y: 55 },
      { label: 'ST', x: 48, y: 55 },
    ],
  },
  {
    name: '4-2-3-1',
    slots: [
      { label: 'GK', x: CX, y: 94 },
      { label: 'LB', x: 10, y: 80 },
      { label: 'CB', x: 28, y: 82 },
      { label: 'CB', x: 48, y: 82 },
      { label: 'RB', x: 66, y: 80 },
      { label: 'DM', x: 28, y: 72 },
      { label: 'DM', x: 48, y: 72 },
      { label: 'LW', x: 12, y: 61 },
      { label: 'AM', x: CX, y: 63 },
      { label: 'RW', x: 64, y: 61 },
      { label: 'ST', x: CX, y: 53 },
    ],
  },
  {
    name: '5-3-2',
    slots: [
      { label: 'GK', x: CX, y: 94 },
      { label: 'LWB', x: 8, y: 78 },
      { label: 'CB', x: 22, y: 82 },
      { label: 'CB', x: CX, y: 83 },
      { label: 'CB', x: 54, y: 82 },
      { label: 'RWB', x: 68, y: 78 },
      { label: 'CM', x: 22, y: 68 },
      { label: 'CM', x: CX, y: 70 },
      { label: 'CM', x: 54, y: 68 },
      { label: 'ST', x: 28, y: 55 },
      { label: 'ST', x: 48, y: 55 },
    ],
  },
];

export function mirrorSlot(slot: FormationSlot): { x: number; y: number } {
  return { x: PITCH_W - slot.x, y: PITCH_H - slot.y };
}

export function getFormation(name: string): Formation | undefined {
  return FORMATIONS.find((f) => f.name === name);
}
