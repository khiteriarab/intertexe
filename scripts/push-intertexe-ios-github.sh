#!/usr/bin/env bash
# Publish the local INTERTEXE iOS Xcode project to GitHub.
#
# Why this exists: khiteriarab/intertexe-ios does not exist. The iPhone app
# lives on the founder Mac at ~/Desktop/intertexe-ios. Cloud agents attached
# to khiteriarab/intertexe cannot see or push that tree.
#
# Run on the Mac that has Xcode:
#   bash scripts/push-intertexe-ios-github.sh
#
# Optional:
#   INTERTEXE_IOS_ROOT=/path/to/intertexe-ios
#   INTERTEXE_IOS_REPO=khiteriarab/intertexe-ios

set -euo pipefail

REPO="${INTERTEXE_IOS_REPO:-khiteriarab/intertexe-ios}"
DEFAULT_ROOT="${HOME}/Desktop/intertexe-ios"
ROOT="${INTERTEXE_IOS_ROOT:-$DEFAULT_ROOT}"
BRANCH="main"

die() { echo "error: $*" >&2; exit 1; }
info() { echo "==> $*"; }

if [[ "$(uname -s)" != "Darwin" ]]; then
  cat <<EOF
This is not the founder Mac (uname=$(uname -s)).

GitHub has no khiteriarab/intertexe-ios repo. The Xcode project is only at
  /Users/khiteri/Desktop/intertexe-ios
on Khiteri's Mac. This Linux cloud workspace is khiteriarab/intertexe
(website). It has zero .swift / .xcodeproj files, so it cannot commit or
push an iOS build.

On the Mac, from a clone of this website repo (or copy this script over):

  bash scripts/push-intertexe-ios-github.sh

That creates ${REPO}, commits local iOS work, and pushes ${BRANCH}.
Then point Xcode Cloud / the next Cursor agent at ${REPO} — not this website.
EOF
  exit 2
fi

command -v git >/dev/null || die "git is required"
command -v gh >/dev/null || die "GitHub CLI (gh) is required and must be logged in"

[[ -d "$ROOT" ]] || die "iOS project not found at $ROOT
Set INTERTEXE_IOS_ROOT to the folder that contains the .xcodeproj."

cd "$ROOT"
info "iOS root: $ROOT"

XCODE_PROJECT="$(find . -maxdepth 3 \( -name '*.xcodeproj' -o -name '*.xcworkspace' \) ! -path './intertexe-website/*' ! -path './browser-extension/*' ! -path './.git/*' | head -n 1 || true)"
[[ -n "$XCODE_PROJECT" ]] || die "No .xcodeproj / .xcworkspace under $ROOT (excluding nested website/extension copies).
This folder does not look like the INTERTEXE iOS app."

info "Found Xcode project: $XCODE_PROJECT"

GITIGNORE_FILE="$ROOT/.gitignore"
if [[ ! -f "$GITIGNORE_FILE" ]]; then
  info "Writing iOS .gitignore"
  cat > "$GITIGNORE_FILE" <<'GITIGNORE'
# Nested copies already published to other GitHub repos — do not upload here.
/intertexe-website/
/browser-extension/

# Xcode / CocoaPods / SPM
DerivedData/
*.xcuserstate
xcuserdata/
*.xccheckout
*.xcscmblueprint
*.moved-aside
*.hmap
*.ipa
*.dSYM.zip
*.dSYM
build/
Build/
Pods/
Podfile.lock
.swiftpm/xcode/package.xcworkspace/contents.xcworkspacedata
.sourcekit-lsp/

# Secrets — never commit
.env
.env.*
!.env.example
*.p8
*.p12
*.mobileprovision
AuthKey_*.p8
GoogleService-Info.plist
*Secret*.xcconfig
*Secrets*.xcconfig

# macOS
.DS_Store
GITIGNORE
fi

if [[ ! -d .git ]]; then
  info "Initializing git repository"
  git init -b "$BRANCH"
fi

if ! git rev-parse --abbrev-ref HEAD >/dev/null 2>&1; then
  git checkout -B "$BRANCH"
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" != "$BRANCH" ]]; then
  info "On $CURRENT_BRANCH — pushing that branch as well as creating $BRANCH if needed"
fi

if git status --porcelain | grep -q .; then
  git add -A
  git reset HEAD -- intertexe-website browser-extension 2>/dev/null || true
  if git diff --cached --quiet; then
    info "Nothing to commit after excluding nested website/extension copies"
  else
    git commit -m "Publish INTERTEXE iOS source so GitHub / Xcode Cloud builds can run."
    info "Created commit $(git rev-parse --short HEAD)"
  fi
else
  info "Working tree already clean"
fi

git rev-parse HEAD >/dev/null 2>&1 || die "No commits in $ROOT. Add the Xcode project first."

if ! gh repo view "$REPO" >/dev/null 2>&1; then
  info "Creating GitHub repo $REPO"
  gh repo create "$REPO" --private --source=. --remote=origin --push --description "INTERTEXE iOS — Fabric Scanner"
else
  info "GitHub repo $REPO already exists"
  if git remote get-url origin >/dev/null 2>&1; then
    info "origin: $(git remote get-url origin)"
  else
    git remote add origin "https://github.com/${REPO}.git"
  fi
  git push -u origin HEAD
fi

info "Pushed $(git rev-parse --short HEAD) to https://github.com/${REPO}"
cat <<EOF

Next:
  1. Open Xcode → Settings → Accounts / Xcode Cloud and connect ${REPO}
  2. Archive / TestFlight from this commit, after ScannerView.swift compiles
     and the Share Extension App Group is enabled on the Apple team
  3. Launch the next Cursor Cloud Agent against ${REPO}, not khiteriarab/intertexe

Do not put AuthKey_*.p8, .p12, or GoogleService-Info.plist on GitHub.
EOF
