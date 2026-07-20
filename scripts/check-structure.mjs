import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const COMPONENTS_DIR = 'src/components';

function toKebabCase(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

const errors = [];

for (const entry of readdirSync(COMPONENTS_DIR)) {
  const dir = join(COMPONENTS_DIR, entry);
  if (!statSync(dir).isDirectory()) continue;

  if (!existsSync(join(dir, 'index.tsx'))) {
    errors.push(`${dir}/ is missing index.tsx`);
  }

  const expectedScss = `${toKebabCase(entry)}.scss`;
  if (!existsSync(join(dir, expectedScss))) {
    errors.push(`${dir}/ is missing ${expectedScss} (kebab-case, matching the folder name)`);
  }
}

if (errors.length > 0) {
  console.error('Component structure check failed:\n');
  for (const line of errors) console.error(`  - ${line}`);
  console.error(
    '\nEach src/components/<Name>/ folder needs an index.tsx and a <kebab-name>.scss file.',
  );
  process.exit(1);
}

console.log('Component structure OK.');
