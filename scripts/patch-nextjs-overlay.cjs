const fs = require('fs');
const path = require('path');

const HYDRATION_CHECK = 'indexOf("Hydration")';

function patchFile(relPath, replacements) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) return;
  let content = fs.readFileSync(fullPath, 'utf8');
  let changed = false;
  for (const [find, replace] of replacements) {
    if (content.includes(find) && !content.includes(find.slice(0, 10) + ' var _h=')) {
      const patched = find.replace(find, replace);
      if (content.includes(find)) {
        content = content.replace(find, replace);
        changed = true;
      }
    }
  }
  if (changed) {
    fs.writeFileSync(fullPath, content);
    console.log('Patched:', relPath);
  } else {
    if (content.includes(HYDRATION_CHECK)) {
      console.log('Already patched:', relPath);
    } else {
      console.log('Pattern not found:', relPath);
    }
  }
}

const hydCheck = '(error.message||"");if(m.indexOf("Hydration")!==-1||m.indexOf("hydrat")!==-1||m.indexOf("#418")!==-1||m.indexOf("#423")!==-1||m.indexOf("did not match")!==-1||m.indexOf("Text content does not match")!==-1||m.indexOf("Loading chunk")!==-1)';
const errCheck = '(err.message||"");if(m.indexOf("Hydration")!==-1||m.indexOf("hydrat")!==-1||m.indexOf("#418")!==-1||m.indexOf("#423")!==-1||m.indexOf("did not match")!==-1||m.indexOf("Loading chunk")!==-1)';

const boundaryFiles = [
  'node_modules/next/dist/esm/next-devtools/userspace/app/app-dev-overlay-error-boundary.js',
  'node_modules/next/dist/next-devtools/userspace/app/app-dev-overlay-error-boundary.js',
];
for (const f of boundaryFiles) {
  const fullPath = path.resolve(__dirname, '..', f);
  if (!fs.existsSync(fullPath)) continue;
  let content = fs.readFileSync(fullPath, 'utf8');
  if (content.includes(HYDRATION_CHECK)) {
    console.log('Already patched:', f);
    continue;
  }
  content = content.replace(
    'static getDerivedStateFromError(error) {',
    'static getDerivedStateFromError(error) { var m=error&&' + hydCheck + 'return null;'
  );
  content = content.replace(
    'componentDidCatch(err) {',
    'componentDidCatch(err) { var m=err&&' + errCheck + 'return;'
  );
  fs.writeFileSync(fullPath, content);
  console.log('Patched:', f);
}

const errorHandlerFiles = [
  'node_modules/next/dist/esm/next-devtools/userspace/app/errors/use-error-handler.js',
  'node_modules/next/dist/next-devtools/userspace/app/errors/use-error-handler.js',
];
for (const f of errorHandlerFiles) {
  const fullPath = path.resolve(__dirname, '..', f);
  if (!fs.existsSync(fullPath)) continue;
  let content = fs.readFileSync(fullPath, 'utf8');
  if (content.includes(HYDRATION_CHECK)) {
    console.log('Already patched:', f);
    continue;
  }
  content = content.replace(
    'function onUnhandledError(event) {',
    'function onUnhandledError(event) { var _te=event&&event.error;if(_te){var _tm=(_te.message||"");if(_tm.indexOf("Hydration")!==-1||_tm.indexOf("hydrat")!==-1||_tm.indexOf("#418")!==-1||_tm.indexOf("#423")!==-1||_tm.indexOf("did not match")!==-1||_tm.indexOf("Loading chunk")!==-1){event.preventDefault();return false}}'
  );
  fs.writeFileSync(fullPath, content);
  console.log('Patched:', f);
}

const consoleFiles = [
  'node_modules/next/dist/esm/next-devtools/userspace/app/errors/intercept-console-error.js',
  'node_modules/next/dist/next-devtools/userspace/app/errors/intercept-console-error.js',
];
for (const f of consoleFiles) {
  const fullPath = path.resolve(__dirname, '..', f);
  if (!fs.existsSync(fullPath)) continue;
  let content = fs.readFileSync(fullPath, 'utf8');
  if (content.includes(HYDRATION_CHECK)) {
    console.log('Already patched:', f);
    continue;
  }
  content = content.replace(
    'window.console.error = function error() {',
    'window.console.error = function error() { var _fa=arguments[0];if(_fa){var _fm=typeof _fa==="string"?_fa:(_fa&&_fa.message)||"";if(typeof _fm==="string"&&(_fm.indexOf("Hydration")!==-1||_fm.indexOf("hydrat")!==-1||_fm.indexOf("#418")!==-1||_fm.indexOf("#423")!==-1||_fm.indexOf("did not match")!==-1||_fm.indexOf("Loading chunk")!==-1))return}'
  );
  fs.writeFileSync(fullPath, content);
  console.log('Patched:', f);
}

console.log('Done.');
