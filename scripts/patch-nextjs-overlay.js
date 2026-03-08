const fs = require('fs');
const path = require('path');

const files = [
  'node_modules/next/dist/esm/next-devtools/userspace/app/app-dev-overlay-error-boundary.js',
  'node_modules/next/dist/next-devtools/userspace/app/app-dev-overlay-error-boundary.js',
];

const hydrationGuard = 'var m=error&&(error.message||"");if(m.indexOf("Hydration")!==-1||m.indexOf("hydrat")!==-1||m.indexOf("#418")!==-1||m.indexOf("#423")!==-1||m.indexOf("did not match")!==-1||m.indexOf("Text content does not match")!==-1||m.indexOf("Loading chunk")!==-1)return null;';
const catchGuard = 'var m=err&&(err.message||"");if(m.indexOf("Hydration")!==-1||m.indexOf("hydrat")!==-1||m.indexOf("#418")!==-1||m.indexOf("#423")!==-1||m.indexOf("did not match")!==-1||m.indexOf("Loading chunk")!==-1)return;';

for (const file of files) {
  const fullPath = path.resolve(__dirname, '..', file);
  if (!fs.existsSync(fullPath)) continue;
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  if (!content.includes('indexOf("Hydration")')) {
    content = content.replace(
      'static getDerivedStateFromError(error) {',
      'static getDerivedStateFromError(error) { ' + hydrationGuard
    );
    content = content.replace(
      'componentDidCatch(err) {',
      'componentDidCatch(err) { ' + catchGuard
    );
    fs.writeFileSync(fullPath, content);
    console.log('Patched:', file);
  } else {
    console.log('Already patched:', file);
  }
}
