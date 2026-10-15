#!/usr/bin/env node
// Lists every piece of work deliberately left for a later part, from the `LATER(part N): …`
// markers written where that work goes (PORTING_PLAN §1).
//
//   npm run later          every open marker, grouped by part
//   npm run later -- 10    only part 10's (a part is done when this prints none)

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const scanned = [
  'src',
  '__tests__',
  'App.tsx',
  'index.js',
  'android/app/src',
  'ios/Cartell',
];
const extensions = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.kt',
  '.java',
  '.swift',
  '.m',
  '.xml',
  '.gradle',
]);
const marker = /LATER\(part (\d+)\):\s*(.*)$/;

function* files(target) {
  const full = path.join(root, target);
  if (!fs.existsSync(full)) {
    return;
  }
  if (fs.statSync(full).isFile()) {
    yield full;
    return;
  }
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    if (
      entry.name === 'node_modules' ||
      entry.name === 'build' ||
      entry.name.startsWith('.')
    ) {
      continue;
    }
    const child = path.join(target, entry.name);
    if (entry.isDirectory()) {
      yield* files(child);
    } else if (extensions.has(path.extname(entry.name))) {
      yield path.join(root, child);
    }
  }
}

const byPart = new Map();
for (const target of scanned) {
  for (const file of files(target)) {
    fs.readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, index) => {
        const match = line.match(marker);
        if (match) {
          const part = Number(match[1]);
          const text = match[2].replace(/\s*\*\/\s*\}?\s*$/, '').trim();
          const where = `${path
            .relative(root, file)
            .split(path.sep)
            .join('/')}:${index + 1}`;
          if (!byPart.has(part)) {
            byPart.set(part, []);
          }
          byPart.get(part).push({ where, text });
        }
      });
  }
}

const only = process.argv[2] === undefined ? null : Number(process.argv[2]);
const parts = [...byPart.keys()]
  .sort((a, b) => a - b)
  .filter(p => only === null || p === only);
if (parts.length === 0) {
  console.log(
    only === null ? 'No LATER markers.' : `Part ${only}: nothing left.`,
  );
  process.exit(0);
}
let total = 0;
for (const part of parts) {
  const items = byPart.get(part);
  total += items.length;
  console.log(`\nPart ${part} (${items.length})`);
  for (const { where, text } of items) {
    console.log(`  ${where}  ${text}`);
  }
}
console.log(`\n${total} open marker${total === 1 ? '' : 's'}.`);
