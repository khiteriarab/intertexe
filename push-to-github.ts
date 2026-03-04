import { Octokit } from "@octokit/rest";
import { execSync } from "child_process";

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) throw new Error("X_REPLIT_TOKEN not found");

  connectionSettings = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=github",
    { headers: { Accept: "application/json", "X-Replit-Token": xReplitToken } }
  ).then(r => r.json()).then(d => d.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token ||
    connectionSettings?.settings?.oauth?.credentials?.access_token;
  if (!accessToken) throw new Error("GitHub not connected");
  return accessToken;
}

async function pushToGitHub() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  const { data: user } = await octokit.users.getAuthenticated();
  console.log(`Authenticated as: ${user.login}`);

  const owner = user.login;
  const repo = "intertexe";

  try {
    await octokit.repos.get({ owner, repo });
    console.log(`Repo ${owner}/${repo} exists.`);
  } catch {
    console.log(`Creating repo ${owner}/${repo}...`);
    await octokit.repos.createForAuthenticatedUser({
      name: repo, private: true,
      description: "INTERTEXE — Material-first luxury fashion discovery platform",
    });
  }

  const fs = await import("fs");
  const path = await import("path");

  const trackedFiles = execSync("git ls-files", { cwd: "/home/runner/workspace", encoding: "utf-8" })
    .trim().split("\n").filter(f => f && !f.startsWith(".git"));

  const extraFiles = [".npmrc", ".nvmrc"];
  for (const ef of extraFiles) {
    if (!trackedFiles.includes(ef) && fs.existsSync(path.join("/home/runner/workspace", ef))) {
      trackedFiles.push(ef);
    }
  }

  console.log(`Uploading ${trackedFiles.length} tracked files via GitHub API...`);

  const blobs: { path: string; sha: string; mode: string; type: string }[] = [];
  const BATCH_SIZE = 5;

  async function uploadBlob(filePath: string, retries = 3): Promise<{ path: string; sha: string; mode: string; type: string } | null> {
    const fullPath = path.join("/home/runner/workspace", filePath);
    if (!fs.existsSync(fullPath)) return null;
    const content = fs.readFileSync(fullPath).toString("base64");
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const { data } = await octokit.git.createBlob({
          owner, repo, content, encoding: "base64",
        });
        return { path: filePath, sha: data.sha, mode: "100644" as const, type: "blob" as const };
      } catch (err: any) {
        if (attempt < retries - 1) {
          const wait = Math.pow(2, attempt + 1) * 1000;
          console.log(`  Retry ${attempt + 1} for ${filePath} (waiting ${wait}ms)...`);
          await new Promise(r => setTimeout(r, wait));
        } else {
          console.error(`  FAILED: ${filePath} after ${retries} attempts: ${err.message}`);
          return null;
        }
      }
    }
    return null;
  }

  for (let i = 0; i < trackedFiles.length; i += BATCH_SIZE) {
    const batch = trackedFiles.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(batch.map(f => uploadBlob(f)));
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) blobs.push(r.value);
    }
    console.log(`  ${Math.min(i + BATCH_SIZE, trackedFiles.length)}/${trackedFiles.length} files uploaded...`);
    if (i + BATCH_SIZE < trackedFiles.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  const uploadedPaths = new Set(blobs.map(b => b.path));
  const criticalFiles = ["package.json", "package-lock.json", "vercel.json", ".npmrc", ".nvmrc"];
  for (const cf of criticalFiles) {
    if (trackedFiles.includes(cf) && !uploadedPaths.has(cf)) {
      console.error(`CRITICAL: ${cf} failed to upload! Aborting.`);
      process.exit(1);
    }
  }

  console.log(`All ${blobs.length}/${trackedFiles.length} files uploaded. Creating tree...`);

  const { data: tree } = await octokit.git.createTree({
    owner, repo, tree: blobs as any,
  });

  const now = new Date().toISOString().split("T")[0];
  const commitMessage = process.argv[2] || `INTERTEXE sync ${now}`;

  let parentSha: string | undefined;
  try {
    const { data: ref } = await octokit.git.getRef({ owner, repo, ref: "heads/main" });
    parentSha = ref.object.sha;
  } catch {}

  const commitParams: any = { owner, repo, message: commitMessage, tree: tree.sha };
  if (parentSha) commitParams.parents = [parentSha];

  const { data: commit } = await octokit.git.createCommit(commitParams);
  console.log(`Commit created: ${commit.sha.substring(0, 8)}`);

  try {
    await octokit.git.updateRef({ owner, repo, ref: "heads/main", sha: commit.sha, force: true });
    console.log("Updated main branch.");
  } catch {
    await octokit.git.createRef({ owner, repo, ref: "refs/heads/main", sha: commit.sha });
    console.log("Created main branch.");
  }

  console.log(`\nSuccessfully pushed to https://github.com/${owner}/${repo}`);
}

pushToGitHub().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
