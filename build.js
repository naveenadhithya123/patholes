const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
console.log('[Build] Starting unified build in:', cwd);

// Determine client directory
let clientDir = cwd;
if (fs.existsSync(path.join(cwd, 'client', 'package.json'))) {
  clientDir = path.join(cwd, 'client');
}

console.log('[Build] Installing client dependencies in:', clientDir);
execSync('npm install', { cwd: clientDir, stdio: 'inherit' });

console.log('[Build] Compiling Vite production assets in:', clientDir);
execSync('npm run build', { cwd: clientDir, stdio: 'inherit' });

// Ensure dist is mirrored to root /dist and client/dist for universal Vercel compatibility
const clientDist = path.join(clientDir, 'dist');
const rootDist = path.join(cwd, 'dist');

if (fs.existsSync(clientDist)) {
  if (clientDist !== rootDist) {
    console.log('[Build] Mirroring client/dist to root dist for Vercel...');
    fs.cpSync(clientDist, rootDist, { recursive: true });
  }
}

console.log('[Build] Production build successfully created!');
