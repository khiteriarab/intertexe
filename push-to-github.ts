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
    { headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken } }
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

  const trackedFiles = execSync("git ls-files", { cwd: "/home/runner/workspace", encoding: "utf-8" })
    .trim().split("\n").filter(f => f && !f.startsWith(".git"));

  console.log(`Uploading ${trackedFiles.length} tracked files via GitHub API...`);

  const fs = await import("fs");
  const path = await import("path");

  const blobs: { path: string; sha: string; mode: string; type: string }[] = [];
  let count = 0;

  for (const filePath of trackedFiles) {
    const fullPath = path.join("/home/runner/workspace", filePath);
    if (!fs.existsSync(fullPath)) continue;

    const content = fs.readFileSync(fullPath);
    const base64Content = content.toString("base64");

    try {
      const { data } = await octokit.git.createBlob({
        owner, repo,
        content: base64Content,
        encoding: "base64",
      });
      blobs.push({ path: filePath, sha: data.sha, mode: "100644", type: "blob" });
      count++;
      if (count % 50 === 0) console.log(`  ${count}/${trackedFiles.length} files uploaded...`);
    } catch (err: any) {
      console.error(`  Failed to upload ${filePath}: ${err.message}`);
    }
  }

  console.log(`All ${count} files uploaded. Creating tree...`);

  const { data: tree } = await octokit.git.createTree({
    owner, repo,
    tree: blobs as any,
  });

  const commitMessage = "Mobile UX polish + token-based auth";

  let parentSha: string | undefined;
  try {
    const { data: ref } = await octokit.git.getRef({ owner, repo, ref: "heads/main" });
    parentSha = ref.object.sha;
  } catch {}

  const commitParams: any = {
    owner, repo,
    message: commitMessage,
    tree: tree.sha,
  };
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
