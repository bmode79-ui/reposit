#!/usr/bin/env python3
"""List vault files ready for Google Drive sync (MCP create_file)."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VAULT = ROOT / "vault" / "English-Study"
CONFIG = ROOT / "drive-config.json"


def main() -> None:
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    print(f"Drive root: {config['driveRootFolderUrl']}")
    print(f"Folder ID:  {config['driveRootFolderId']}")
    print()
    for path in sorted(VAULT.rglob("*.md")):
        rel = path.relative_to(VAULT)
        print(f"  {rel} ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
