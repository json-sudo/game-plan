import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 } });

const SAMPLE_WINDOW_MS = 12000;
const ATTACHMENT_OFFSET = 3.7;
const TOLERANCE = 0.05;
const MIN_ATTACHED_SHARE = 0.2;

interface Sample {
  ball: { x: number; y: number };
  attackers: { x: number; y: number }[];
  balls: number;
  markers: number;
}

async function startPlayback(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page
    .getByRole('radiogroup', { name: 'My team' })
    .getByRole('radio', { name: '4-3-3 DM Wide' })
    .click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: /^(Done|Save)$/ }).click();
  await page.getByRole('button', { name: 'Right flank - final third' }).click();
  await expect(page.getByText(/^Starts with /)).toBeVisible();
}

function collectSamples(page: Page): Promise<Sample[]> {
  return page.evaluate(
    (windowMs) =>
      new Promise<Sample[]>((resolve) => {
        const read = (element: Element) => {
          const match = element
            .getAttribute('style')
            ?.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
          return { x: Number(match?.[1]), y: Number(match?.[2]) };
        };
        const samples: Sample[] = [];
        const begin = performance.now();
        const frame = () => {
          const balls = document.querySelectorAll('g[aria-label="Ball"]');
          const attackers = [...document.querySelectorAll('g[data-team="mine"]')];
          samples.push({
            ball: read(balls[0]),
            attackers: attackers.map(read),
            balls: balls.length,
            markers: document.querySelectorAll('[data-destination], [data-marker]').length,
          });
          if (performance.now() - begin < windowMs) requestAnimationFrame(frame);
          else resolve(samples);
        };
        requestAnimationFrame(frame);
      }),
    SAMPLE_WINDOW_MS,
  );
}

function isAttached(sample: Sample): boolean {
  return sample.attackers.some(
    (player) =>
      Math.abs(sample.ball.x - player.x) < TOLERANCE &&
      Math.abs(player.y - sample.ball.y - ATTACHMENT_OFFSET) < TOLERANCE,
  );
}

test('during playback the ball stays attached to the carrier outside passes and no marker flashes', async ({
  page,
}) => {
  await startPlayback(page);
  const samples = await collectSamples(page);

  const stillAndDetached = samples.filter((sample, index) => {
    const previous = samples[index - 1];
    const isStill =
      previous && previous.ball.x === sample.ball.x && previous.ball.y === sample.ball.y;
    return isStill && !isAttached(sample);
  });
  expect(stillAndDetached).toEqual([]);

  const attached = samples.filter(isAttached).length;
  expect(attached / samples.length).toBeGreaterThan(MIN_ATTACHED_SHARE);
  expect(samples.every((sample) => sample.balls === 1)).toBe(true);
  expect(samples.every((sample) => sample.markers === 0)).toBe(true);

  const travelled = new Set(samples.map((sample) => `${sample.ball.x},${sample.ball.y}`));
  expect(travelled.size).toBeGreaterThan(20);
});
