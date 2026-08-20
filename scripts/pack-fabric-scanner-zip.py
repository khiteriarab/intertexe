#!/usr/bin/env python3
"""Pack Fabric Scanner with manifest.json at the zip root (Chrome Web Store)."""

from __future__ import annotations

import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "chrome-web-store" / "save-to-intertexe"
MANIFEST = json.loads((SRC / "manifest.json").read_text())
OUT = ROOT / "public" / "downloads" / f"INTERTEXE-Fabric-Scanner-{MANIFEST['version']}.zip"


def pack() -> Path:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(SRC.rglob("*")):
            if path.is_file() and path.name != ".DS_Store":
                zf.write(path, path.relative_to(SRC).as_posix())
    names = zipfile.ZipFile(OUT).namelist()
    if "manifest.json" not in names:
        raise SystemExit(f"manifest.json missing at zip root: {names}")
    if any(name.startswith("save-to-intertexe/") for name in names):
        raise SystemExit("Chrome Web Store zip must not nest files under save-to-intertexe/")
    print(f"packed {OUT} ({OUT.stat().st_size} bytes, {len(names)} files)")
    return OUT


if __name__ == "__main__":
    pack()
