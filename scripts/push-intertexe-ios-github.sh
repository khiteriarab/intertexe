#!/usr/bin/env bash
# Commit + push the Mac INTERTEXE iOS tree to the git remote Xcode Cloud already builds.
#
# Xcode Cloud builds 423 and 424 failed with 1 error on the same "Stop sending…"
# commit that succeeded as 422. This Linux website clone cannot change that —
# there is no .swift here. Run this on the founder Mac.
#
#   bash scripts/push-intertexe-ios-github.sh
#
# Optional:
#   INTERTEXE_IOS_ROOT=/path/to/intertexe-ios

set -euo pipefail

DEFAULT_MAC_ROOT="/Users/khiteri/Desktop/intertexe-ios"
ROOT="${INTERTEXE_IOS_ROOT:-$DEFAULT_MAC_ROOT}"
FALLBACK_REPO="${INTERTEXE_IOS_REPO:-khiteriarab/intertexe-ios}"

die() { echo "error: $*" >&2; exit 1; }
info() { echo "==> $*"; }

fix_scanner_auto() {
  local f
  f="$(find . -name 'ScannerView.swift' ! -path './intertexe-website/*' ! -path './browser-extension/*' | head -n 1 || true)"
  [[ -n "$f" ]] || return 0
  if ! grep -Eq '(textInputAutocapitalization|autocapitalization|keyboardType|focusMode|exposureMode)\(\.auto\)|\.auto\b' "$f"; then
    info "ScannerView.swift has no .auto token to patch ($f)"
    return 0
  fi
  info "Patching known invalid .auto uses in $f"
  python3 - "$f" <<'PY'
import pathlib, re, sys
path = pathlib.Path(sys.argv[1])
text = path.read_text()
orig = text
replacements = [
    (r"textInputAutocapitalization\(\.auto\)", "textInputAutocapitalization(.sentences)"),
    (r"autocapitalization\(\.auto\)", "textInputAutocapitalization(.sentences)"),
    (r"keyboardType\(\.auto\)", "keyboardType(.default)"),
    (r"focusMode\s*=\s*\.auto\b", "focusMode = .continuousAutoFocus"),
    (r"exposureMode\s*=\s*\.auto\b", "exposureMode = .continuousAutoExposure"),
    (r"AVCaptureDevice\.FocusMode\.auto\b", "AVCaptureDevice.FocusMode.continuousAutoFocus"),
    (r"AVCaptureDevice\.ExposureMode\.auto\b", "AVCaptureDevice.ExposureMode.continuousAutoExposure"),
]
for pattern, repl in replacements:
    text = re.sub(pattern, repl, text)
if text == orig:
    print("no conservative .auto replacement matched; open the Xcode Cloud error line", file=sys.stderr)
else:
    path.write_text(text)
    print(f"updated {path}")
PY
}

if [[ "$(uname -s)" != "Darwin" ]]; then
  cat <<EOF
This Cursor agent is on Linux, cloning khiteriarab/intertexe (website).
It has no iOS source, so it cannot commit a fix for Xcode Cloud 423 / 424.

Those builds failed with 1 error on the same "Stop sending…" commit that
succeeded as 422 (17 Aug). Website pushes do not change that product.
Xcode Cloud compiles the git remote of:

  ${DEFAULT_MAC_ROOT}

On the Mac:

  bash scripts/push-intertexe-ios-github.sh

That commits local iOS work (including a ScannerView.swift .auto patch when
present) and git pushes to the existing origin Xcode Cloud already watches,
which is what can make build 425 succeed.
EOF
  exit 2
fi

command -v git >/dev/null || die "git is required"

[[ -d "$ROOT" ]] || die "iOS project not found at $ROOT
Set INTERTEXE_IOS_ROOT to the folder that contains the .xcodeproj."

cd "$ROOT"
info "iOS root: $ROOT"

XCODE_PROJECT="$(find . -maxdepth 3 \( -name '*.xcodeproj' -o -name '*.xcworkspace' \) ! -path './intertexe-website/*' ! -path './browser-extension/*' ! -path './.git/*' | head -n 1 || true)"
[[ -n "$XCODE_PROJECT" ]] || die "No .xcodeproj / .xcworkspace under $ROOT (excluding nested website/extension copies)."

info "Found Xcode project: $XCODE_PROJECT"
[[ -d .git ]] || die "$ROOT is not a git repo. Xcode Cloud needs git. Open the real INTERTEXE iOS folder."

info "HEAD $(git rev-parse --short HEAD) on $(git rev-parse --abbrev-ref HEAD)"
if git remote get-url origin >/dev/null 2>&1; then
  info "origin $(git remote get-url origin)"
else
  info "no origin remote yet"
fi
git status --short | head -40 || true

fix_scanner_auto

if git status --porcelain | grep -q .; then
  git add -A
  git reset HEAD -- intertexe-website browser-extension 2>/dev/null || true
  if git diff --cached --quiet; then
    info "Nothing to commit after excluding nested website/extension copies"
  else
    git commit -m "Fix ScannerView compile error so Xcode Cloud main can go green."
    info "Created commit $(git rev-parse --short HEAD)"
  fi
else
  info "Working tree already clean — Xcode Cloud 423/424 already built this SHA"
  info "If the 1 error is still present, it is on this commit; inspect build 424's red X."
fi

if git remote get-url origin >/dev/null 2>&1; then
  git push -u origin HEAD
  info "Pushed $(git rev-parse --short HEAD) to $(git remote get-url origin)"
else
  command -v gh >/dev/null || die "No git origin, and gh is not installed. Add the remote Xcode Cloud uses, then rerun."
  if gh repo view "$FALLBACK_REPO" >/dev/null 2>&1; then
    git remote add origin "https://github.com/${FALLBACK_REPO}.git"
  else
    info "Creating $FALLBACK_REPO because this iOS tree has no origin"
    gh repo create "$FALLBACK_REPO" --private --source=. --remote=origin --push --description "INTERTEXE iOS — Fabric Scanner"
  fi
  git push -u origin HEAD
  info "Pushed $(git rev-parse --short HEAD) to $(git remote get-url origin)"
  echo "Connect Xcode Cloud to this origin if it was watching a different remote."
fi

cat <<EOF

Xcode Cloud next:
  1. App Store Connect → Xcode Cloud → main → start a new build (425)
  2. If it still fails, open 425's red X and fix that one compiler/signing line
  3. Do not retry the old SHA without a new commit

Do not commit AuthKey_*.p8, .p12, or GoogleService-Info.plist.
EOF
