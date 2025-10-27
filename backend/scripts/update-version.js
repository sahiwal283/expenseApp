#!/usr/bin/env node
/**
 * Updates backend/src/config/version.ts with the current frontend version
 * from the root package.json before building the backend.
 */

const fs = require('fs');
const path = require('path');

try {
  // Read root package.json
  const rootPackagePath = path.join(__dirname, '../../package.json');
  const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, 'utf-8'));
  const frontendVersion = rootPackage.version;

  console.log(`[Version Update] Embedding frontend version: ${frontendVersion}`);

  // Generate version.ts content
  const versionFileContent = `// Auto-generated version file - DO NOT EDIT MANUALLY
// This version is embedded at build time from root package.json
export const FRONTEND_VERSION = '${frontendVersion}';
`;

  // Write to version.ts
  const versionFilePath = path.join(__dirname, '../src/config/version.ts');
  fs.writeFileSync(versionFilePath, versionFileContent, 'utf-8');

  console.log(`[Version Update] ✓ Updated version.ts with frontend version ${frontendVersion}`);
} catch (error) {
  console.error('[Version Update] ✗ Failed to update version:', error.message);
  process.exit(1);
}

