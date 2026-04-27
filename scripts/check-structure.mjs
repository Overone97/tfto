import fs from 'node:fs';

const requiredPaths = [
  'README.md',
  'index.html',
  'src/main.js',
  'src/bootstrap/bootstrapGame.js',
  'src/engine/state/createInitialGameState.js',
  'src/engine/events/createEventBus.js',
  'src/engine/loop/createGameLoop.js',
  'docs/architecture.md',
  'docs/roadmap.md',
  'docs/preproduction.md',
];

const missing = requiredPaths.filter(filePath => !fs.existsSync(filePath));

if (missing.length) {
  console.error('Missing required paths:');
  missing.forEach(filePath => console.error(`- ${filePath}`));
  process.exit(1);
}

console.log('Structure check ok');
