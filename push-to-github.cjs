const { ReplitConnectors } = require("@replit/connectors-sdk");
const fs = require("fs");
const path = require("path");

const c = new ReplitConnectors();
const OWNER = "khiteriarab";
const REPO = "intertexe";

async function ghApi(endpoint, method = "GET", body = null) {
  const opts = { method };
  if (body) {
    opts.body = JSON.stringify(body);
    opts.headers = { "Content-Type": "application/json" };
  }
  const resp = await c.proxy("github", endpoint, opts);
  const text = await resp.text();
  if (resp.status >= 400) throw new Error(`GitHub API ${resp.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

async function main() {
  // Test auth
  const user = await ghApi("/user");
  console.log("Authenticated as:", user.login);
  
  // Get current main branch SHA
  const ref = await ghApi(`/repos/${OWNER}/${REPO}/git/ref/heads/main`);
  const baseSha = ref.object.sha;
  console.log("Current main SHA:", baseSha.slice(0, 7));
  
  // Get the base tree
  const baseCommit = await ghApi(`/repos/${OWNER}/${REPO}/git/commits/${baseSha}`);
  const baseTreeSha = baseCommit.tree.sha;
  
  // Collect all files to push (excluding node_modules, .next, .git, etc.)
  const IGNORE = new Set([".git", "node_modules", ".next", "dist", ".cache", ".local", "attached_assets", ".config"]);
  
  function collectFiles(dir, prefix = "") {
    const files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (IGNORE.has(entry.name)) continue;
      if (entry.name.startsWith(".") && entry.name !== ".replit" && entry.name !== ".gitignore") continue;
      const fullPath = path.join(dir, entry.name);
      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        files.push(...collectFiles(fullPath, relPath));
      } else {
        files.push({ path: relPath, fullPath });
      }
    }
    return files;
  }
  
  const allFiles = collectFiles("/home/runner/workspace");
  console.log(`Found ${allFiles.length} files to push`);
  
  // Create blobs for all files
  const treeItems = [];
  let count = 0;
  for (const file of allFiles) {
    try {
      const content = fs.readFileSync(file.fullPath);
      const isText = !content.some(b => b === 0);
      
      const blob = await ghApi(`/repos/${OWNER}/${REPO}/git/blobs`, "POST", {
        content: isText ? content.toString("utf8") : content.toString("base64"),
        encoding: isText ? "utf-8" : "base64"
      });
      
      treeItems.push({
        path: file.path,
        mode: "100644",
        type: "blob",
        sha: blob.sha
      });
      count++;
      if (count % 50 === 0) console.log(`  Created ${count}/${allFiles.length} blobs...`);
    } catch (e) {
      console.error(`  Skip ${file.path}: ${e.message.slice(0, 80)}`);
    }
  }
  console.log(`Created ${count} blobs`);
  
  // Create tree
  console.log("Creating tree...");
  const tree = await ghApi(`/repos/${OWNER}/${REPO}/git/trees`, "POST", {
    tree: treeItems
  });
  console.log("Tree SHA:", tree.sha.slice(0, 7));
  
  // Create commit
  console.log("Creating commit...");
  const commit = await ghApi(`/repos/${OWNER}/${REPO}/git/commits`, "POST", {
    message: "Fix quiz recommended products + auto-reload on chunk errors",
    tree: tree.sha,
    parents: [baseSha],
    author: {
      name: "Intertexe",
      email: "khiteriarab@gmail.com",
      date: new Date().toISOString()
    }
  });
  console.log("Commit SHA:", commit.sha.slice(0, 7));
  
  // Update main ref
  console.log("Updating main branch...");
  const update = await ghApi(`/repos/${OWNER}/${REPO}/git/refs/heads/main`, "PATCH", {
    sha: commit.sha,
    force: false
  });
  console.log("Done! Main updated to:", update.object.sha.slice(0, 7));
}

main().catch(e => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
