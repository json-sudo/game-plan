import { describe, expect, it } from 'vitest';
import { chooseReceiver, type ReceiverInput } from './receiver';

function receiverInput(overrides: Partial<ReceiverInput>): ReceiverInput {
  return {
    attacker: 'mine',
    carrierId: 'carrier',
    passerId: null,
    teammateIds: [],
    opponentIds: [],
    positions: {},
    ...overrides,
  };
}

describe('chooseReceiver', () => {
  it('picks the most progressive teammate when nobody is close to an opponent', () => {
    const positions = {
      carrier: { x: 38, y: 50 },
      forward: { x: 30, y: 30 },
      level: { x: 60, y: 50 },
    };
    expect(
      chooseReceiver(receiverInput({ positions, teammateIds: ['carrier', 'forward', 'level'] })),
    ).toBe('forward');
  });

  it('picks a level teammate over a pressured forward one', () => {
    const positions = {
      carrier: { x: 38, y: 50 },
      level: { x: 46, y: 50 },
      forward: { x: 38, y: 40 },
      defender: { x: 38, y: 40 },
    };
    expect(
      chooseReceiver(
        receiverInput({
          positions,
          teammateIds: ['level', 'forward'],
          opponentIds: ['defender'],
        }),
      ),
    ).toBe('level');
  });

  it('picks a backward teammate when it scores best', () => {
    const positions = {
      carrier: { x: 38, y: 50 },
      behind: { x: 38, y: 51 },
      forward: { x: 38, y: 40 },
      defender: { x: 38, y: 40 },
    };
    expect(
      chooseReceiver(
        receiverInput({
          positions,
          teammateIds: ['behind', 'forward'],
          opponentIds: ['defender'],
        }),
      ),
    ).toBe('behind');
  });

  it('breaks ties by player id', () => {
    const positions = {
      carrier: { x: 38, y: 50 },
      b: { x: 20, y: 40 },
      a: { x: 56, y: 40 },
    };
    expect(chooseReceiver(receiverInput({ positions, teammateIds: ['b', 'a'] }))).toBe('a');
  });

  it('never returns the passer unless the passer is the only option', () => {
    const positions = {
      carrier: { x: 38, y: 50 },
      passer: { x: 38, y: 30 },
      other: { x: 60, y: 60 },
    };
    expect(
      chooseReceiver(
        receiverInput({ positions, passerId: 'passer', teammateIds: ['passer', 'other'] }),
      ),
    ).toBe('other');
    expect(
      chooseReceiver(receiverInput({ positions, passerId: 'passer', teammateIds: ['passer'] })),
    ).toBe('passer');
  });

  it('returns null when there is no teammate to pass to', () => {
    expect(
      chooseReceiver(
        receiverInput({ positions: { carrier: { x: 38, y: 50 } }, teammateIds: ['carrier'] }),
      ),
    ).toBeNull();
  });
});
