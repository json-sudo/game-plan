import { readFileSync } from 'node:fs';

const REDUCER_PATH = 'src/board/boardReducer.ts';
const VARIABLES_PATH = 'src/shared/styles/_variables.scss';

const TS_TO_SCSS_KEY = {
  mine: 'team-mine',
  mineKeeper: 'team-mine-keeper',
  opponent: 'team-opponent',
  opponentKeeper: 'team-opponent-keeper',
  ball: 'ball',
};

function extractTsColors(source) {
  const block = source.match(/TEAM_COLORS\s*=\s*{([^}]*)}/);
  if (!block) throw new Error(`TEAM_COLORS not found in ${REDUCER_PATH}`);
  const colors = {};
  for (const match of block[1].matchAll(/(\w+):\s*'(#[0-9A-Fa-f]{6})'/g)) {
    colors[match[1]] = match[2].toUpperCase();
  }
  return colors;
}

function extractScssColors(source) {
  const colors = {};
  for (const match of source.matchAll(/\$([\w-]+):\s*(#[0-9A-Fa-f]{6});/g)) {
    colors[match[1]] = match[2].toUpperCase();
  }
  return colors;
}

const tsColors = extractTsColors(readFileSync(REDUCER_PATH, 'utf8'));
const scssColors = extractScssColors(readFileSync(VARIABLES_PATH, 'utf8'));

const mismatches = [];
for (const [tsKey, scssKey] of Object.entries(TS_TO_SCSS_KEY)) {
  const tsValue = tsColors[tsKey];
  const scssValue = scssColors[scssKey];
  if (!tsValue) {
    mismatches.push(`TEAM_COLORS.${tsKey} is missing in ${REDUCER_PATH}`);
  } else if (!scssValue) {
    mismatches.push(`$${scssKey} is missing in ${VARIABLES_PATH}`);
  } else if (tsValue !== scssValue) {
    mismatches.push(`TEAM_COLORS.${tsKey} (${tsValue}) !== $${scssKey} (${scssValue})`);
  }
}

if (mismatches.length > 0) {
  console.error('Color mismatch between TEAM_COLORS and _variables.scss:\n');
  for (const line of mismatches) console.error(`  - ${line}`);
  console.error(
    `\nUpdate ${REDUCER_PATH} and ${VARIABLES_PATH} together so the board colors stay in sync.`,
  );
  process.exit(1);
}

console.log('Colors in sync between TEAM_COLORS and _variables.scss.');
