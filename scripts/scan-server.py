#!/usr/bin/env python3
"""Serve public/ and capture every scan to disk.

Debugging the scanner from screenshots is guesswork: you can see that a mark was
missed but not what the reader actually measured. This serves the same files as
`python3 -m http.server` and adds one endpoint - POST /_capture - which the
scanner calls after every read, writing the source photo, the rectified image
and the full per-bubble numbers into card/scan-captures/.

    python3 scripts/scan-server.py [port]
"""

import base64
import datetime
import json
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public")
CAPTURES = os.path.join(ROOT, "card", "scan-captures")


def _decode_data_url(url):
    if not url or "," not in url:
        return None
    return base64.b64decode(url.split(",", 1)[1])


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=PUBLIC, **kw)

    def do_POST(self):
        if self.path != "/_capture":
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except Exception as exc:
            self.send_error(400, str(exc))
            return

        stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
        folder = os.path.join(CAPTURES, stamp)
        os.makedirs(folder, exist_ok=True)

        for key, name in (("photo", "photo.jpg"), ("rectified", "rectified.jpg")):
            raw = _decode_data_url(payload.get(key))
            if raw:
                with open(os.path.join(folder, name), "wb") as fh:
                    fh.write(raw)

        with open(os.path.join(folder, "result.json"), "w") as fh:
            json.dump(
                {
                    "when": stamp,
                    "userAgent": payload.get("ua"),
                    "note": payload.get("note"),
                    "result": payload.get("result"),
                },
                fh,
                indent=2,
            )

        body = json.dumps({"ok": True, "id": stamp}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
        print("captured", stamp, flush=True)

    def end_headers(self):
        # the scanner measures a hidden copy of the card, so a stale cached copy
        # would silently make every reading wrong
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        if "_capture" in (args[0] if args else ""):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    os.makedirs(CAPTURES, exist_ok=True)
    print(f"serving {PUBLIC} on 0.0.0.0:{port}")
    print(f"captures -> {CAPTURES}")
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
