#!/usr/bin/env node
const { spawnSync, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const isWindows = os.platform() === 'win32';

console.log('========================================');
console.log('Vercel CLI Login Authorization');
console.log('========================================');
console.log('');

// Check if vercel is installed
if (isWindows) {
  const result = spawnSync('where', ['vercel'], { stdio: 'ignore' });
  if (result.status !== 0) {
    console.log('Error: Vercel CLI is not installed');
    process.exit(1);
  }
} else {
  const result = spawnSync('sh', ['-c', 'command -v vercel'], { stdio: 'ignore' });
  if (result.status !== 0) {
    console.log('Error: Vercel CLI is not installed');
    process.exit(1);
  }
}

// Create temp log file
const tmpDir = path.join(process.cwd(), '.vercel-tmp');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}
const LOG_FILE = path.join(tmpDir, 'login.log');

// Check login status
console.log('Checking login status...');
try {
  const result = spawnSync('vercel', ['whoami'], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], shell: isWindows });
  const output = (result.stdout || '').trim();
  if (result.status === 0 && output && !output.includes('Error') && !output.includes('not logged in')) {
    console.log(`Logged in as: ${output}`);
    console.log('');
    console.log('Already logged in, no need to login again.');
    process.exit(0);
  }
} catch {}

console.log('Starting login authorization...');
console.log('');

// Start background login
const logStream = fs.openSync(LOG_FILE, 'w');
const child = spawn('vercel', ['login'], {
  detached: true,
  stdio: ['ignore', logStream, logStream],
  shell: isWindows
});

child.unref();
console.log(`Background login process started (PID: ${child.pid})`);
console.log(`Log file: ${LOG_FILE}`);

// Wait for auth URL
async function waitForAuthUrl() {
  for (let i = 0; i < 40; i++) {
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      if (fs.existsSync(LOG_FILE)) {
        const content = fs.readFileSync(LOG_FILE, 'utf8');
        const match = content.match(/https:\/\/vercel\.com\/oauth\/device\?user_code=[A-Z0-9-]+(?=\s|$)/);
        if (match) {
          return match[0];
        }
      }
    } catch (e) {}
  }
  return null;
}

const authUrl = await waitForAuthUrl();
if (authUrl) {
  console.log('');
  console.log('========================================');
  console.log('Authorization URL extracted');
  console.log(`vercel login is running in background (PID: ${child.pid})`);
  console.log('Opening browser for authorization...');
  console.log('========================================');
  console.log('');
  
  // Open browser
  if (isWindows) {
    spawnSync('powershell', ['-Command', `Start-Process '${authUrl}'`], { stdio: 'ignore', windowsHide: true });
  } else if (os.platform() === 'darwin') {
    spawnSync('open', [authUrl], { stdio: 'ignore' });
  } else {
    spawnSync('xdg-open', [authUrl], { stdio: 'ignore' });
  }
  
  console.log('Browser opened automatically.');
  console.log('');
  console.log('Please complete the following steps:');
  console.log('1. Review the authorization request in your browser');
  console.log('2. Click "Allow" to authorize the Vercel CLI');
  console.log('3. Let me know when you\'ve completed the authorization');
  console.log('');
  console.log(`Authorization URL: [${authUrl}](${authUrl})`);
  console.log('');
  console.log('[END OF RESPONSE - Agent stops here and waits for user confirmation]');
} else {
  console.log('Failed to get authorization URL');
  console.log('Check log file for details: ' + LOG_FILE);
  process.exit(1);
}
