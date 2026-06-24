const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getAbi, getTarget } = require('node-abi');

/** Known VS Code / Electron forks on macOS (newest hosts first). */
const ELECTRON_APP_CANDIDATES = [
  'Antigravity IDE',
  'Antigravity',
  'Cursor',
  'Windsurf',
  'Visual Studio Code - Insiders',
  'Visual Studio Code',
  'VSCodium',
];

const ELECTRON_FRAMEWORK_RELATIVE =
  'Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework';

const ELECTRON_VERSION_PATTERN = /\b([0-9]+\.[0-9]+\.[0-9]+)\b/g;

/** Fallback when no local IDE install is detected. */
const DEFAULT_ELECTRON_VERSION = '40.0.0';

function isElectronVersion(value) {
  const major = Number.parseInt(value.split('.')[0], 10);
  return Number.isFinite(major) && major >= 20 && major <= 50;
}

function extractElectronVersion(binaryPath) {
  try {
    const output = execSync(`strings "${binaryPath}"`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 16 * 1024 * 1024,
    });

    const candidates = new Set();
    for (const match of output.matchAll(ELECTRON_VERSION_PATTERN)) {
      const version = match[1];
      if (isElectronVersion(version)) {
        candidates.add(version);
      }
    }

    const sorted = [...candidates].sort((left, right) => {
      const leftParts = left.split('.').map(Number);
      const rightParts = right.split('.').map(Number);
      for (let index = 0; index < 3; index += 1) {
        const delta = (rightParts[index] ?? 0) - (leftParts[index] ?? 0);
        if (delta !== 0) {
          return delta;
        }
      }
      return 0;
    });

    return (
      sorted.find((version) => {
        try {
          return getAbi(version, 'electron') !== undefined;
        } catch {
          return false;
        }
      }) ?? null
    );
  } catch {
    return null;
  }
}

function resolveFromTargetAbi(targetAbi) {
  try {
    return getTarget(String(targetAbi), 'electron');
  } catch {
    return null;
  }
}

function frameworkPathForApp(appName) {
  return path.join('/Applications', `${appName}.app`, ELECTRON_FRAMEWORK_RELATIVE);
}

/**
 * Scans installed editors and returns detected Electron versions.
 */
function detectInstalledElectronVersions() {
  const found = [];

  for (const appName of ELECTRON_APP_CANDIDATES) {
    const frameworkPath = frameworkPathForApp(appName);
    if (!fs.existsSync(frameworkPath)) {
      continue;
    }

    const version = extractElectronVersion(frameworkPath);
    if (!version) {
      continue;
    }

    found.push({
      appName,
      frameworkPath,
      version,
      abi: getAbi(version, 'electron'),
    });
  }

  return found.sort((left, right) => right.abi - left.abi);
}

function pickElectronVersion(installs) {
  if (installs.length === 0) {
    return DEFAULT_ELECTRON_VERSION;
  }

  if (process.env.MKSFLOW_REBUILD_LOWEST_ABI === '1') {
    return installs[installs.length - 1].version;
  }

  return installs[0].version;
}

/**
 * Resolves the Electron version used for rebuilding better-sqlite3.
 */
function detectElectronVersion() {
  if (process.env.MKSFLOW_ELECTRON_VERSION?.trim()) {
    return process.env.MKSFLOW_ELECTRON_VERSION.trim();
  }

  if (process.env.MKSFLOW_TARGET_ABI?.trim()) {
    const fromAbi = resolveFromTargetAbi(process.env.MKSFLOW_TARGET_ABI.trim());
    if (fromAbi) {
      return fromAbi;
    }
  }

  const installs = detectInstalledElectronVersions();
  return pickElectronVersion(installs);
}

function getExpectedAbi(electronVersion) {
  return getAbi(electronVersion, 'electron');
}

module.exports = {
  DEFAULT_ELECTRON_VERSION,
  ELECTRON_APP_CANDIDATES,
  detectElectronVersion,
  detectInstalledElectronVersions,
  getExpectedAbi,
  resolveFromTargetAbi,
};

if (require.main === module) {
  const installs = detectInstalledElectronVersions();
  if (installs.length > 0) {
    console.log('Detected editors:');
    for (const install of installs) {
      console.log(
        `  - ${install.appName}: Electron ${install.version} (ABI ${install.abi})`,
      );
    }
  } else {
    console.log('No local Electron-based editor detected in /Applications.');
  }

  const version = detectElectronVersion();
  console.log(`Selected rebuild target: Electron ${version} (ABI ${getExpectedAbi(version)})`);
}
