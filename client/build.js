const { execSync } = require('child_process');

console.log('[Build] Building client...');
execSync('npm install', { stdio: 'inherit' });
execSync('npm run build', { stdio: 'inherit' });
console.log('[Build] Client build finished!');
