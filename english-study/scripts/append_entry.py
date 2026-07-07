#!/usr/bin/env python3
"""Append an English study entry to the local journal (and optionally Drive later)."""

from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "drive-config.json"
JOURNAL_DIR = ROOT / "journal"


def load_config() -> dict:
    with CONFIG_PATH.open(encoding="utf-8") as f:
        return json.load(f)


def journal_path(config: dict) -> Path:
    JOURNAL_DIR.mkdir(parents=True, exist_ok=True)
    return JOURNAL_DIR / config.get("journalFile", "english-journal.md")


def format_entry(entry: dict) -> str:
    ts = entry.get("timestamp") or datetime.now().strftime("%Y-%m-%d %H:%M")
    lines = [
        f"## {ts} — {entry.get('summary', 'Study entry')}",
        "",
        "### 원문",
        entry.get("original", ""),
        "",
        "### 번역",
        entry.get("translation", ""),
        "",
        "### 어휘",
        "",
    ]

    for word in entry.get("vocabulary", []):
        lines.extend(
            [
                f"#### {word.get('word', '')}",
                f"- **원어민 빈도**: {word.get('frequency', '')}",
                f"- **한글 발음**: {word.get('korean_pronunciation', '')}",
                f"- **발음기호**: {word.get('ipa', '')}",
                f"- **품사**: {word.get('pos', '')}",
                f"- **뉘앙스**: {word.get('nuance', '')}",
                f"- **예문**: {word.get('example', '')}",
                f"- **예문 해석**: {word.get('example_translation', '')}",
                f"- **예문 문법**: {word.get('example_grammar', '')}",
                "",
            ]
        )

    lines.append("---")
    lines.append("")
    return "\n".join(lines)


def append_entry(entry: dict) -> Path:
    config = load_config()
    path = journal_path(config)
    block = format_entry(entry)
    with path.open("a", encoding="utf-8") as f:
        f.write(block)
    return path


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: append_entry.py '<json entry>'", file=sys.stderr)
        sys.exit(1)
    entry = json.loads(sys.argv[1])
    path = append_entry(entry)
    print(path)


if __name__ == "__main__":
    main()
