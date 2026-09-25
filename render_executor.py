import os
import json
import hmac
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SERVICE = "ASTRA_RENDER_EXECUTOR"
VERSION = "1.0.1"
TOKEN_SHA256 = "8beec7cad873f2be11cdc1113372f53c82bbeb499f986a155ef798058c8f95ee"
PORT = int(os.environ.get("PORT", "10000"))
MAX_BODY = 65536
ALLOWED_ACTIONS = {"RENDER_ECHO_TEST"}

def canonical_hash(value):
    raw = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()

class Handler(BaseHTTPRequestHandler):
    server_version = "ASTRA-Render-Executor/1.0"

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
                "mode": "TEST_ONLY",
                "allowed_actions": sorted(ALLOWED_ACTIONS),
            })
        return self._json(404, {"ok": False, "error": "NOT_FOUND"})

    def do_POST(self):
        if self.path != "/execute":
            return self._json(404, {"ok": False, "error": "NOT_FOUND"})

        supplied = self.headers.get("X-ASTRA-RENDER-TOKEN", "")
        supplied_hash = hashlib.sha256(supplied.encode("utf-8")).hexdigest() if supplied else ""
        if not supplied or not hmac.compare_digest(supplied_hash, TOKEN_SHA256):
            return self._json(401, {"ok": False, "error": "UNAUTHORIZED"})

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
        if request["action_type"] not in ALLOWED_ACTIONS:
            return self._json(403, {"ok": False, "error": "ACTION_NOT_ALLOWED"})
        if not isinstance(request["payload"], dict):
            return self._json(400, {"ok": False, "error": "PAYLOAD_INVALID"})

        output = {
            "echo": request["payload"],
            "executor": SERVICE,
            "version": VERSION,
            "mode": "TEST_ONLY",
        }
        evidence = {
            "effect_id": str(request["effect_id"]),
            "job_id": str(request["job_id"]),
            "generation": int(request["generation"]),
            "fence_token": str(request["fence_token"]),
            "action_type": request["action_type"],
            "output": output,
        }
        return self._json(200, {
            "ok": True,
            "status": "SUCCEEDED",
            **evidence,
            "evidence_sha256": canonical_hash(evidence),
        })

if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
