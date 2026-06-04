const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const {
  detectElectronVersion,
  getExpectedAbi,
} = require('./detect-electron');

const electronVersion = detectElectronVersion();
const expectedAbi = getExpectedAbi(electronVersion);

const projectRoot = path.join(__dirname, '..');
const addonDir = path.join(
  projectRoot,
  'node_modules',
  'better-sqlite3',
  'build',
  'Release',
);
const nodeBinary = path.join(addonDir, 'better_sqlite3.node');
const forgeMeta = path.join(addonDir, '.forge-meta');

function readBuiltAbi() {
  if (!fs.existsSync(forgeMeta)) {
    return null;
  }

  const meta = fs.readFileSync(forgeMeta, 'utf8').trim();
  const parts = meta.split('--');
  return parts.length > 1 ? parts[parts.length - 1] : null;
}

function needsRebuild() {
  if (!fs.existsSync(nodeBinary)) {
    return true;
  }

  return readBuiltAbi() !== expectedAbi;
}

function rebuild(force = false) {
  if (!force && !needsRebuild()) {
    console.log(
      `better-sqlite3 already targets Electron ${electronVersion} (ABI ${expectedAbi})`,
    );
    return;
  }

  console.log(
    `Rebuilding better-sqlite3 for Electron ${electronVersion} (ABI ${expectedAbi})...`,
  );

  execSync(
    `npx electron-rebuild --force --build-from-source --only better-sqlite3 --version ${electronVersion}`,
    { stdio: 'inherit', cwd: projectRoot },
  );

  const builtAbi = readBuiltAbi();
  if (builtAbi !== expectedAbi) {
    throw new Error(
      `better-sqlite3 rebuild finished but ABI is ${builtAbi ?? 'unknown'}, expected ${expectedAbi}`,
    );
  }

  console.log(
    `better-sqlite3 rebuilt for Electron ${electronVersion} (ABI ${expectedAbi})`,
  );
}

const force = process.argv.includes('--force');

try {
  rebuild(force);
} catch (error) {
  console.warn(
    'Warning: electron-rebuild for better-sqlite3 failed.',
    'Run "npm run rebuild:electron" manually, then reload the window.',
  );
  console.warn(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
