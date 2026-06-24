#!/usr/bin/env node
const { spawnSync } = require('child_process');
const os = require('os');
const isWindows = os.platform() === 'win32';

console.log('========================================');
console.log('Vercel CLI Installation Script');
console.log('========================================');
console.log('');

// Check if vercel is already installed
if (isWindows) {
  const result = spawnSync('where', ['vercel'], { stdio: 'ignore' });
  if (result.status === 0) {
    console.log('Vercel CLI is already installed!');
    process.exit(0);
  }
} else {
  const result = spawnSync('sh', ['-c', 'command -v vercel'], { stdio: 'ignore' });
  if (result.status === 0) {
    console.log('Vercel CLI is already installed!');
    process.exit(0);
  }
}

// Detect package manager
let pkgManager = 'npm';
if (spawnSync('pnpm', ['--version'], { stdio: 'ignore' }).status === 0) {
  pkgManager = 'pnpm';
} else if (spawnSync('yarn', ['--version'], { stdio: 'ignore' }).status === 0) {
  pkgManager = 'yarn';
}

console.log(`Installing Vercel CLI using ${pkgManager}...`);
console.log('');

let installCmd, installArgs;
if (pkgManager === 'pnpm') {
  installCmd = 'pnpm';
  installArgs = ['add', '-g', 'vercel'];
} else if (pkgManager === 'yarn') {
  installCmd = 'yarn';
  installArgs = ['global', 'add', 'vercel'];
} else {
  installCmd = 'npm';
  installArgs = ['install', '-g', 'vercel'];
}

const result = spawnSync(installCmd, installArgs, { stdio: 'inherit' });

if (result.status === 0) {
  console.log('');
  console.log('========================================');
  console.log('Vercel CLI installed successfully!');
  console.log('========================================');
} else {
  console.log('Installation failed!');
  process.exit(1);
}
