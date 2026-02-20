import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

const OWNER = 'khiteriarab';
const REPO = 'intertexe';

const IGNORE = new Set([
  '.git', 'node_modules', '.cache', '.config', '.local', 'dist',
  '.upm', '.replit', 'replit.nix', '.replit.nix', 'scripts',
  'generated-icon.png', '.breakpoints'
]);

function getAllFiles(dir: string, base: string = ''): { path: string; fullPath: string }[] {
  const results: { path: string; fullPath: string }[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(entry.name)) continue;
    if (entry.name.startsWith('.')) continue;
    const rel = base ? `${base}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllFiles(full, rel));
    } else {
      results.push({ path: rel, fullPath: full });
    }
  }
  return results;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const token = await getAccessToken();
  const octokit = new Octokit({ auth: token });

  console.log('Authenticated with GitHub. Pushing to', `${OWNER}/${REPO}...`);

  // Check if repo is empty and initialize if needed
  let needsInit = false;
  try {
    await octokit.git.getRef({ owner: OWNER, repo: REPO, ref: 'heads/main' });
  } catch (e: any) {
    needsInit = true;
  }

  if (needsInit) {
    console.log('Repo has no main branch, initializing...');
    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path: '.gitkeep',
      message: 'Initialize repository',
      content: Buffer.from('').toString('base64'),
    });
    console.log('Initialized. Waiting for GitHub to process...');
    await sleep(5000);
  }

  const files = getAllFiles('/home/runner/workspace');
  console.log(`Found ${files.length} files to push.`);

  // Create blobs with retry
  const blobs: { path: string; sha: string }[] = [];
  let count = 0;

  for (const file of files) {
    const content = fs.readFileSync(file.fullPath);
    const base64 = content.toString('base64');
    
    let retries = 3;
    while (retries > 0) {
      try {
        const blob = await octokit.git.createBlob({
          owner: OWNER,
          repo: REPO,
          content: base64,
          encoding: 'base64',
        });
        blobs.push({ path: file.path, sha: blob.data.sha });
        break;
      } catch (e: any) {
        retries--;
        if (retries === 0) throw e;
        console.log(`  Retry for ${file.path}...`);
        await sleep(2000);
      }
    }
    count++;
    if (count % 20 === 0) console.log(`  ${count}/${files.length} files processed...`);
  }
  console.log(`All ${files.length} blobs created.`);

  // Create tree
  const tree = await octokit.git.createTree({
    owner: OWNER,
    repo: REPO,
    tree: blobs.map(b => ({
      path: b.path,
      mode: '100644' as const,
      type: 'blob' as const,
      sha: b.sha,
    })),
  });

  // Get current HEAD
  const ref = await octokit.git.getRef({ owner: OWNER, repo: REPO, ref: 'heads/main' });
  const parentSha = ref.data.object.sha;

  // Create commit
  const commit = await octokit.git.createCommit({
    owner: OWNER,
    repo: REPO,
    message: 'INTERTEXE: Full project sync from Replit',
    tree: tree.data.sha,
    parents: [parentSha],
  });

  // Update ref
  await octokit.git.updateRef({
    owner: OWNER,
    repo: REPO,
    ref: 'heads/main',
    sha: commit.data.sha,
    force: true,
  });

  console.log('\nSuccessfully pushed to GitHub!');
  console.log(`View at: https://github.com/${OWNER}/${REPO}`);
}

main().catch(err => {
  console.error('Push failed:', err.message);
  process.exit(1);
});
