#!/usr/bin/env node

/**
 * Syncs version info from app.json to native iOS Info.plist
 * Run before EAS builds to ensure versions match
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

// Read app.json
const appJsonPath = resolve(rootDir, 'app.json');
const appJson = JSON.parse(readFileSync(appJsonPath, 'utf8'));

const version = appJson.expo.version;
const buildNumber = appJson.expo.ios?.buildNumber || '1';

console.log(`Syncing version ${version} (build ${buildNumber}) to native projects...`);

// Update iOS Info.plist
const infoPlistPath = resolve(rootDir, 'ios/PrincipalAI/Info.plist');
let infoPlist = readFileSync(infoPlistPath, 'utf8');

// Update CFBundleShortVersionString
infoPlist = infoPlist.replace(
  /(<key>CFBundleShortVersionString<\/key>\s*<string>)[^<]*(<\/string>)/,
  `$1${version}$2`
);

// Update CFBundleVersion
infoPlist = infoPlist.replace(
  /(<key>CFBundleVersion<\/key>\s*<string>)[^<]*(<\/string>)/,
  `$1${buildNumber}$2`
);

writeFileSync(infoPlistPath, infoPlist);
console.log('✓ Updated ios/PrincipalAI/Info.plist');

console.log('Version sync complete!');
