import { describe, expect, it } from 'vitest';
import { receiverScore } from './receiver';

const CARRIER = { x: 38, y: 50 };

describe('receiverScore', () => {
  it('prefers the more progressive candidate when nobody is close to an opponent', () => {
    expect(receiverScore(CARRIER, { x: 38, y: 35 }, [])).toBeGreaterThan(
      receiverScore(CARRIER, { x: 38, y: 45 }, []),
    );
  });

  it('penalises a candidate under pressure', () => {
    const defender = { x: 38, y: 38 };
    expect(receiverScore(CARRIER, { x: 38, y: 36 }, [defender])).toBeLessThan(
      receiverScore(CARRIER, { x: 38, y: 36 }, []),
    );
  });

  it('scores a backward candidate below a forward one at equal distance', () => {
    expect(receiverScore(CARRIER, { x: 38, y: 60 }, [])).toBeLessThan(
      receiverScore(CARRIER, { x: 38, y: 40 }, []),
    );
  });
});
