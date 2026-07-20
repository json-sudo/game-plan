import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// A running background agent appends to its transcript under
// /private/tmp/claude-<uid>/<encoded-cwd>/<session>/tasks/*.output.
// While one is mid-flight the working tree is legitimately half-edited,
// so the quality gate would only report false alarms — skip until quiet.
const ACTIVE_TASK_WINDOW_MS = 2 * 60 * 1000;

function newestTaskOutputAgeMs() {
  const encodedCwd = process.cwd().replaceAll('/', '-');
  let newest = Infinity;
  let tmpEntries;
  try {
    tmpEntries = readdirSync('/private/tmp');
  } catch {
    return newest;
  }
  for (const tmpEntry of tmpEntries) {
    if (!tmpEntry.startsWith('claude-')) continue;
    const projectDir = join('/private/tmp', tmpEntry, encodedCwd);
    let sessions;
    try {
      sessions = readdirSync(projectDir);
    } catch {
      continue;
    }
    for (const session of sessions) {
      const tasksDir = join(projectDir, session, 'tasks');
      let files;
      try {
        files = readdirSync(tasksDir);
      } catch {
        continue;
      }
      for (const file of files) {
        if (!file.endsWith('.output')) continue;
        try {
          const age = Date.now() - statSync(join(tasksDir, file)).mtimeMs;
          if (age < newest) newest = age;
        } catch {
          // File vanished mid-scan; ignore.
        }
      }
    }
  }
  return newest;
}

const taskAge = newestTaskOutputAgeMs();
if (taskAge < ACTIVE_TASK_WINDOW_MS) {
  console.log(
    `stop-check: skipped — a background agent task wrote output ${Math.round(taskAge / 1000)}s ago; the tree may be mid-edit.`,
  );
  process.exit(0);
}

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
