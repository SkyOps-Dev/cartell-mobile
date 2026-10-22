#!/usr/bin/env node
// Selects the build environment, the RN equivalent of Flutter's
// `--dart-define-from-file=envs/<name>.json` (spec 02 §1).
//
//   node scripts/use-env.js <dev|test|beta|live|simulator> [key=value ...]
//
// Reads envs/<name>.json (this app's own environment files; see envs/README.md) and writes
// src/config/env.generated.json, which is gitignored. Trailing key=value pairs override single
// keys, like `--dart-define=baseDomain=192.168.1.50:8000`.

const fs = require('fs');
const path = require('path');

const KNOWN_KEYS = [
  'baseDomain',
  'shouldUseTLS',
  'sentryPublicKey',
  'envIdentifier',
  'macAddressHashKey',
  'hubAddress',
  'hubPort',
  'hubReplyPort',
  'skipWifiHandoff',
  // Not from Flutter: the Node backend's address, for call sites moved to nodeBaseUrlHttp().
  'nodeBaseDomain',
];

const [name, ...overrides] = process.argv.slice(2);
if (!name) {
  console.error(
    'Usage: node scripts/use-env.js <dev|test|beta|live|simulator> [key=value ...]',
  );
  process.exit(1);
}

const source = path.resolve(__dirname, '..', 'envs', `${name}.json`);
if (!fs.existsSync(source)) {
  console.error(`No such environment file: ${source}`);
  process.exit(1);
}

const env = JSON.parse(fs.readFileSync(source, 'utf8'));
for (const pair of overrides) {
  const eq = pair.indexOf('=');
  if (eq <= 0) {
    console.error(`Override must be key=value, got '${pair}'`);
    process.exit(1);
  }
  env[pair.slice(0, eq)] = pair.slice(eq + 1);
}

const unknown = Object.keys(env).filter(k => !KNOWN_KEYS.includes(k));
if (unknown.length > 0) {
  console.warn(`Ignoring keys the app does not read: ${unknown.join(', ')}`);
}

const target = path.resolve(
  __dirname,
  '..',
  'src',
  'config',
  'env.generated.json',
);
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(env, null, 2) + '\n');

// Print only non-secret values.
console.log(
  `Environment '${name}': ${env.envIdentifier ?? 'UNSET'} → ` +
    `${env.shouldUseTLS === 'false' ? 'http' : 'https'}://${
      env.baseDomain ?? 'cartellap.com'
    }` +
    (env.nodeBaseDomain ? ` (Node: ${env.nodeBaseDomain})` : ''),
);
