#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const standalone = path.join(root, '.next', 'standalone');
const destination = path.join(root, '.desktop-server');
const buildArguments = process.argv.slice(2);
if (buildArguments.some((argument) => argument !== '--skip-build')) {
  throw new Error('Usage: node scripts/build-desktop.cjs [--skip-build]');
}

// Always rebuild on the target OS/architecture. Next's traced dependencies can
// include native modules, so a server copied from another platform is unsuitable.
fs.rmSync(destination, { recursive: true, force: true });
if (!buildArguments.includes('--skip-build')) {
  fs.rmSync(path.join(root, '.next'), { recursive: true, force: true });
  const build = spawnSync(process.execPath, [require.resolve('next/dist/bin/next'), 'build'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, DOCKER_BUILD: '1', NEXT_TELEMETRY_DISABLED: '1' },
  });
  if (build.error) throw build.error;
  if (build.status !== 0) process.exit(build.status || 1);
}

if (!fs.existsSync(path.join(standalone, 'server.js'))) {
  throw new Error('Next standalone/server.js is missing; confirm DOCKER_BUILD=1 enables standalone output.');
}

function includeFile(source) {
  const name = path.basename(source);
  return name !== '.DS_Store' && name !== '.env' && !name.startsWith('.env.');
}

// Dereference traced symlinks so the final application is self-contained.
const copyOptions = { recursive: true, dereference: true, filter: includeFile };
fs.cpSync(standalone, destination, copyOptions);
fs.cpSync(path.join(root, 'public'), path.join(destination, 'public'), copyOptions);
fs.cpSync(path.join(root, '.next', 'static'), path.join(destination, '.next', 'static'), copyOptions);
fs.rmSync(path.join(destination, '.next', 'cache'), { recursive: true, force: true });

for (const entry of ['server.js', '.next/BUILD_ID', '.next/static', 'public']) {
  if (!fs.existsSync(path.join(destination, entry))) {
    throw new Error(`Desktop server is incomplete: missing ${entry}`);
  }
}
console.log(`Desktop server prepared: ${destination} (${process.platform}/${process.arch})`);
