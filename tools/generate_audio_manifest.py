#!/usr/bin/env python3
"""Generate audio-library.manifest.json from an audio folder."""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

SUPPORTED_EXTENSIONS = (".ogg", ".mp3", ".wav", ".m4a", ".aac")
FORMAT_PRIORITY = {
    ".ogg": 0,
    ".mp3": 1,
    ".m4a": 2,
    ".aac": 3,
    ".wav": 4,
}


def normalize_extensions(raw: str) -> set[str]:
    values = [entry.strip().lower() for entry in raw.split(",") if entry.strip()]
    normalized: set[str] = set()
    for value in values:
        normalized.add(value if value.startswith(".") else f".{value}")
    if not normalized:
        normalized = set(SUPPORTED_EXTENSIONS)
    return normalized


def sanitize_id(value: str) -> str:
    token = value.strip().lower().replace("\\", "/")
    token = re.sub(r"[^a-z0-9]+", "_", token)
    token = re.sub(r"_+", "_", token).strip("_")
    return token or "audio_asset"


def title_from_stem(stem: str) -> str:
    words = re.split(r"[_\-\s]+", stem.strip())
    words = [word for word in words if word]
    if not words:
        return "Audio Asset"
    return " ".join(word.capitalize() for word in words)


def collect_asset_bundles(input_dir: Path, extensions: set[str]) -> dict[str, list[str]]:
    bundles: dict[str, list[str]] = {}
    if not input_dir.exists() or not input_dir.is_dir():
        return bundles

    for file_path in input_dir.rglob("*"):
        if not file_path.is_file() or file_path.suffix.lower() not in extensions:
            continue
        relative = file_path.relative_to(input_dir)
        relative_no_ext = relative.with_suffix("").as_posix()
        bundles.setdefault(relative_no_ext, []).append(relative.as_posix())
    return bundles


def derive_group(path_key: str) -> str:
    parts = path_key.split("/")
    if len(parts) <= 1:
        return "misc"
    return sanitize_id(parts[0])


def derive_tags(path_key: str, group: str) -> list[str]:
    parts = [sanitize_id(part) for part in path_key.split("/") if part]
    tags = {tag for tag in parts if tag and tag != group}
    for part in parts:
        tags.update(token for token in part.split("_") if len(token) >= 2)
    tags.add(group)
    return sorted(tags)


def sort_files(files: list[str]) -> list[str]:
    return sorted(
        files,
        key=lambda path: (FORMAT_PRIORITY.get(Path(path).suffix.lower(), 99), path),
    )


def build_manifest_assets(input_dir: Path, extensions: set[str]) -> list[dict]:
    bundles = collect_asset_bundles(input_dir, extensions)
    assets: list[dict] = []
    seen_ids: set[str] = set()

    for key in sorted(bundles.keys()):
        files = sort_files(bundles[key])
        group = derive_group(key)
        base_id = sanitize_id(key)
        asset_id = base_id
        counter = 2
        while asset_id in seen_ids:
            asset_id = f"{base_id}_{counter}"
            counter += 1
        seen_ids.add(asset_id)

        stem = key.split("/")[-1]
        assets.append(
            {
                "id": asset_id,
                "label": title_from_stem(stem),
                "group": group,
                "tags": derive_tags(key, group),
                "preload": group in {"ui", "system"},
                "files": files,
            }
        )

    return assets


def build_manifest(args: argparse.Namespace) -> dict:
    input_dir = Path(args.input_dir)
    base_path = args.base_path or input_dir.as_posix()
    assets = build_manifest_assets(input_dir, normalize_extensions(args.extensions))
    return {
        "version": int(args.version),
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "basePath": base_path,
        "preloadLimit": max(0, int(args.preload_limit)),
        "assets": assets,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate audio library manifest JSON")
    parser.add_argument("--input-dir", default="assets/audio", help="Audio root folder to scan")
    parser.add_argument("--output", default="audio-library.manifest.json", help="Output manifest file path")
    parser.add_argument("--base-path", default="", help="Manifest basePath (defaults to input-dir)")
    parser.add_argument("--extensions", default=",".join(SUPPORTED_EXTENSIONS), help="Comma-separated extensions")
    parser.add_argument("--preload-limit", type=int, default=24, help="Initial preload limit (0 disables preload)")
    parser.add_argument("--version", type=int, default=1, help="Manifest schema version")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    manifest = build_manifest(args)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    print(f"Wrote {output_path} with {len(manifest['assets'])} assets.")
    if len(manifest["assets"]) == 0:
        print(f"No assets found under {Path(args.input_dir)}; manifest remains empty.")


if __name__ == "__main__":
    main()
