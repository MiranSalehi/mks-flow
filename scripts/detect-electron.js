const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getAbi, getTarget } = require('node-abi');

const ELECTRON_FRAMEWORK_PATHS = [
  '/Applications/Cursor.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework',
  '/Applications/Visual Studio Code.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework',
  '/Applications/Visual Studio Code - Insiders.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework',
];

const ELECTRON_VERSION_PATTERN = /\b([0-9]+\.[0-9]+\.[0-9]+)\b/g;

/** Fallback for Cursor 3.6.x when auto-detection is unavailable. */
const DEFAULT_ELECTRON_VERSION = '39.8.1';

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

    return sorted.find((version) => {
      try {
        return getAbi(version, 'electron') !== undefined;
      } catch {
        return false;
      }
    }) ?? null;
  } catch {
    return null;
  }
}

function resolveFromTargetAbi(targetAbi) {
  try {
    return getTarget(targetAbi, 'electron');
  } catch {
    return null;
  }
}

/**
 * Resolves the Electron version used by the local VS Code / Cursor install.
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

  for (const frameworkPath of ELECTRON_FRAMEWORK_PATHS) {
    if (!fs.existsSync(frameworkPath)) {
      continue;
    }

    const version = extractElectronVersion(frameworkPath);
    if (version) {
      return version;
    }
  }

  return DEFAULT_ELECTRON_VERSION;
}

function getExpectedAbi(electronVersion) {
  return getAbi(electronVersion, 'electron');
}

module.exports = {
  DEFAULT_ELECTRON_VERSION,
  detectElectronVersion,
  getExpectedAbi,
};

if (require.main === module) {
  const version = detectElectronVersion();
  console.log(`Electron ${version} (ABI ${getExpectedAbi(version)})`);
}
