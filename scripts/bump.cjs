#!/usr/bin/env node
/**
 * Auto-bump patch version and sync VERSION constant in cli.ts
 * Used by: npm run bump / prepublishOnly
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

// 1. Bump patch version in package.json (already done by npm version)
execSync('npm version patch --no-git-tag-version', { cwd: root, stdio: 'inherit' });

// 2. Read new version
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;

// 3. Sync VERSION constant in src/cli.ts
const cliPath = path.join(root, 'src', 'cli.ts');
const content = fs.readFileSync(cliPath, 'utf8');
const updated = content.replace(/const VERSION = '.*'/, `const VERSION = '${version}'`);
fs.writeFileSync(cliPath, updated);

console.log(`✓ Bumped to v${version} (package.json + cli.ts)`);
