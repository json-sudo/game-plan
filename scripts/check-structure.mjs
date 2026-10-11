import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const SRC_DIR = 'src';
const UI_DIR = 'src/ui';

const ALLOWED_LAYER_IMPORTS = {
  data: [],
  engine: ['data'],
  state: ['engine', 'data', 'persistence'],
  persistence: ['data', 'state'],
  share: ['data', 'state', 'engine'],
  ui: ['state', 'engine', 'data', 'persistence', 'share', 'shared'],
  shared: [],
};

const IMPORT_PATTERN = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;

function toKebabCase(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function layerOf(path) {
  const [layer] = relative(SRC_DIR, path).split(sep);
  return layer in ALLOWED_LAYER_IMPORTS ? layer : null;
}

function importedLayer(file, specifier) {
  if (!specifier.startsWith('.')) return null;
  return layerOf(join(file, '..', specifier));
}

const errors = [];

for (const file of walk(SRC_DIR)) {
  if (!/\.(ts|tsx)$/.test(file)) continue;
  const layer = layerOf(file);
  if (!layer) continue;
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(IMPORT_PATTERN)) {
    const target = importedLayer(file, match[1]);
    if (!target || target === layer) continue;
    if (!ALLOWED_LAYER_IMPORTS[layer].includes(target)) {
      errors.push(`${file}: ${layer} must not import ${target} (${match[1]})`);
    }
  }
}

if (existsSync(UI_DIR)) {
  for (const area of readdirSync(UI_DIR)) {
    const areaDir = join(UI_DIR, area);
    if (!statSync(areaDir).isDirectory()) continue;
    for (const entry of readdirSync(areaDir)) {
      const dir = join(areaDir, entry);
      if (!statSync(dir).isDirectory() || !existsSync(join(dir, 'index.tsx'))) continue;
      const expectedScss = `${toKebabCase(entry)}.module.scss`;
      if (!existsSync(join(dir, expectedScss))) {
        errors.push(`${dir}/ is missing ${expectedScss} (kebab-case, matching the folder name)`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error('Structure check failed:\n');
  for (const line of errors) console.error(`  - ${line}`);
  console.error(
    '\nLayer rule: ui may import state, engine and data; engine may import data; data imports no other layer.',
  );
  console.error(
    'Component folders under src/ui/<area>/<Name>/ need an index.tsx and a <kebab-name>.module.scss.',
  );
  process.exit(1);
}

console.log('Structure OK.');
