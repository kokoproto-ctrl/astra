import json
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import os

SERVICE = "ASTRA_RENDER_EXECUTOR"
VERSION = "1.0.2"
MODE = "TEST_ONLY"
PORT = int(os.environ.get("PORT", "10000"))
MAX_BODY = 16384
ALLOWED_ACTIONS = {"RENDER_ECHO_TEST"}

class Handler(BaseHTTPRequestHandler):
    server_version = "ASTRA-Render-Executor/1.0.2"

    def _json(self, code, body):
        data = json.dumps(body, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):
        print(json.dumps({"service": SERVICE, "event": "http", "message": fmt % args}, ensure_ascii=False), flush=True)

    def do_GET(self):
        if self.path == "/health":
            return self._json(200, {
                "ok": True,
                "service": SERVICE,
                "version": VERSION,
                "mode": MODE,
                "auth": "TEST_ONLY_STRICT_PAYLOAD_NO_SECRET",
                "allowed_actions": sorted(ALLOWED_ACTIONS),
            })
        return self._json(404, {"ok": False, "error": "NOT_FOUND"})

    def do_POST(self):
        if self.path != "/execute":
            return self._json(404, {"ok": False, "error": "NOT_FOUND"})

        if self.headers.get("X-ASTRA-MODE", "") != MODE:
            return self._json(403, {"ok": False, "error": "TEST_MODE_REQUIRED"})

        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return self._json(400, {"ok": False, "error": "INVALID_CONTENT_LENGTH"})
        if length <= 0 or length > MAX_BODY:
            return self._json(413, {"ok": False, "error": "BODY_SIZE_INVALID"})

        try:
            request = json.loads(self.rfile.read(length))
        except Exception:
            return self._json(400, {"ok": False, "error": "INVALID_JSON"})

        required = ("effect_id", "job_id", "generation", "fence_token", "action_type", "payload")
        if any(k not in request for k in required):
            return self._json(400, {"ok": False, "error": "REQUIRED_FIELDS_MISSING"})
        if not isinstance(request["effect_id"], str) or not request["effect_id"].startswith("TEST_ONLY_"):
            return self._json(403, {"ok": False, "error": "TEST_EFFECT_REQUIRED"})
        if request["action_type"] not in ALLOWED_ACTIONS:
            return self._json(403, {"ok": False, "error": "ACTION_NOT_ALLOWED"})
        if not isinstance(request["payload"], dict):
            return self._json(400, {"ok": False, "error": "PAYLOAD_INVALID"})
        try:
            uuid.UUID(str(request["job_id"]))
            uuid.UUID(str(request["fence_token"]))
            generation = int(request["generation"])
            if generation <= 0:
                raise ValueError()
        except Exception:
            return self._json(400, {"ok": False, "error": "EXECUTION_IDENTITY_INVALID"})

        return self._json(200, {
            "ok": True,
            "status": "SUCCEEDED",
            "effect_id": request["effect_id"],
            "job_id": str(request["job_id"]),
            "generation": generation,
            "fence_token": str(request["fence_token"]),
            "action_type": request["action_type"],
            "output": {
                "echo": request["payload"],
                "executor": SERVICE,
                "version": VERSION,
                "mode": MODE,
            },
        })

if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
