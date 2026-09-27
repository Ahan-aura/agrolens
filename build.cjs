const fs = require('fs');
const cp = require('child_process');

if (fs.existsSync('frontend')) {
  console.log('[AgroLens Build] Detected repository root. Building frontend...');
  cp.execSync('npm --prefix frontend install && npm --prefix frontend run build', { stdio: 'inherit' });
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  fs.cpSync('frontend/dist', 'dist', { recursive: true });
  console.log('[AgroLens Build] Mirrored frontend/dist to root dist/ successfully.');
} else {
  console.log('[AgroLens Build] Detected frontend directory. Building Vite...');
  cp.execSync('npm run build', { stdio: 'inherit' });
  console.log('[AgroLens Build] Vite build completed successfully.');
}
