import { spawnSync } from 'node:child_process';

const STEPS = [
  { label: 'lint', command: 'npm', args: ['run', 'lint'] },
  { label: 'build', command: 'npm', args: ['run', 'build'] },
  { label: 'test', command: 'npm', args: ['test'] },
];

for (const { label, command, args } of STEPS) {
  console.log(`\n> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { stdio: 'inherit' });

  if (result.error) {
    console.error(`\nstop-check: failed to run "${label}" step: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`\nstop-check: "${label}" step failed (exit code ${result.status}).`);
    process.exit(result.status ?? 1);
  }
}

console.log('\nstop-check: lint, build, and test all passed.');
