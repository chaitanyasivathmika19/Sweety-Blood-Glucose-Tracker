const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PHASE3 = path.join(ROOT, 'Phase-3-Project-Implementation');
const PHASE4 = path.join(ROOT, 'Phase-4-Deployment-and-Hosting');

console.log('Organizing project phases...');
fs.mkdirSync(PHASE3, { recursive: true });
fs.mkdirSync(PHASE4, { recursive: true });

// Helper to copy recursively excluding node_modules and .git
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 1. Populate Phase 3 - Project Implementation
console.log('Copying client to Phase-3...');
copyDir(path.join(ROOT, 'client'), path.join(PHASE3, 'client'));

console.log('Copying server to Phase-3...');
copyDir(path.join(ROOT, 'server'), path.join(PHASE3, 'server'));

console.log('Copying database to Phase-3...');
copyDir(path.join(ROOT, 'database'), path.join(PHASE3, 'database'));

console.log('Copying tests to Phase-3...');
copyDir(path.join(ROOT, 'tests'), path.join(PHASE3, 'tests'));

fs.copyFileSync(path.join(ROOT, '.env.example'), path.join(PHASE3, '.env.example'));
fs.copyFileSync(path.join(ROOT, 'package.json'), path.join(PHASE3, 'package.json'));

// Remove test.txt if present
const testTxt = path.join(PHASE3, 'test.txt');
if (fs.existsSync(testTxt)) fs.unlinkSync(testTxt);

// 2. Populate Phase 4 - Deployment & Hosting
console.log('Copying screenshots to Phase-4...');
copyDir(path.join(ROOT, 'screenshots'), path.join(PHASE4, 'screenshots'));

console.log('Copying docs to Phase-4...');
copyDir(path.join(ROOT, 'docs'), path.join(PHASE4, 'docs'));

fs.copyFileSync(path.join(ROOT, 'docker-compose.yml'), path.join(PHASE4, 'docker-compose.yml'));
fs.copyFileSync(path.join(ROOT, 'render.yaml'), path.join(PHASE4, 'render.yaml'));

console.log('Phase organization completed successfully!');
