#!/usr/bin/env python3
"""
Dev server for 034GameJam.

Features:
- Serves static files from repo root (same as `python -m http.server`).
- Adds a small JSON write API for in-browser debug tooling.
"""

from __future__ import annotations

import argparse
import json
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
ALLOWED_JSON_FILES = {
    "tuning-profile.json": ROOT / "tuning-profile.json",
    "save-slot.json": ROOT / "save-slot.json",
    "audio-profile.json": ROOT / "audio-profile.json",
    "audio-noise-mute-config.json": ROOT / "audio-noise-mute-config.json",
    "data/fixtures/playground/custom-sandbox.json": ROOT / "data/fixtures/playground/custom-sandbox.json",
    "data/tuning/movement.base.json": ROOT / "data/tuning/movement.base.json",
    "data/tuning/gameplay.base.json": ROOT / "data/tuning/gameplay.base.json",
    "data/tuning/camera.base.json": ROOT / "data/tuning/camera.base.json",
    "data/tuning/debug.base.json": ROOT / "data/tuning/debug.base.json",
}


class DevHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self) -> None:
        path = urlparse(self.path).path
        if path.endswith((".html", ".js", ".css", ".json")):
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
        super().end_headers()

    def _send_json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self) -> dict | None:
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return None

        if content_length <= 0:
            return None

        raw = self.rfile.read(content_length)
        try:
            body = json.loads(raw.decode("utf-8"))
        except Exception:
            return None

        if not isinstance(body, dict):
            return None
        return body

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/__api/ping":
            self._send_json({"ok": True})
            return
        super().do_GET()

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path != "/__api/write-json":
            self._send_json({"ok": False, "error": "Not found"}, HTTPStatus.NOT_FOUND)
            return

        body = self._read_json_body()
        if body is None:
            self._send_json({"ok": False, "error": "Invalid JSON body"}, HTTPStatus.BAD_REQUEST)
            return

        file_name = body.get("file")
        if not isinstance(file_name, str) or file_name not in ALLOWED_JSON_FILES:
            self._send_json({"ok": False, "error": "Unsupported file"}, HTTPStatus.FORBIDDEN)
            return

        data = body.get("data")
        target = ALLOWED_JSON_FILES[file_name]

        try:
            target.parent.mkdir(parents=True, exist_ok=True)
            with target.open("w", encoding="utf-8", newline="\n") as fh:
                json.dump(data, fh, ensure_ascii=False, indent=2)
                fh.write("\n")
        except Exception as error:
            self._send_json(
                {"ok": False, "error": f"Write failed: {error}"},
                HTTPStatus.INTERNAL_SERVER_ERROR,
            )
            return

        self._send_json({"ok": True, "file": file_name})


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="034GameJam dev server")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind")
    parser.add_argument("--port", type=int, default=4173, help="Port to bind")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    server = ThreadingHTTPServer((args.host, args.port), DevHandler)
    print(f"Serving {ROOT} at http://{args.host}:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
