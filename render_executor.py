import hashlib
import hmac
import json
import os
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SERVICE = "ASTRA_RENDER_EXECUTOR"
VERSION = "1.1.0"
MODE = "PRODUCTION_GATED"
PORT = int(os.environ.get("PORT", "10000"))
MAX_BODY = 16384
TEST_ACTIONS = {"RENDER_ECHO_TEST"}
PRODUCTION_ACTIONS = {"RENDER_COMPUTE_V1"}
PRODUCTION_TOKEN = os.environ.get("ASTRA_RENDER_EXECUTOR_TOKEN", "")

def canonical_json(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)

def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a

class Handler(BaseHTTPRequestHandler):
    server_version = "ASTRA-Render-Executor/1.1.0"

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
                "auth": "PRODUCTION_TOKEN_REQUIRED_FOR_PRODUCTION_ACTIONS",
                "test_actions": sorted(TEST_ACTIONS),
                "production_actions": sorted(PRODUCTION_ACTIONS),
            })
        return self._json(404, {"ok": False, "error": "NOT_FOUND"})

    def _validate_identity(self, request):
        required = ("effect_id", "job_id", "generation", "fence_token", "action_type", "payload")
        if any(k not in request for k in required):
            return None, "REQUIRED_FIELDS_MISSING"
        if not isinstance(request["effect_id"], str) or not request["effect_id"].strip():
            return None, "EFFECT_ID_INVALID"
        if not isinstance(request["payload"], dict):
            return None, "PAYLOAD_INVALID"
        try:
            uuid.UUID(str(request["job_id"]))
            uuid.UUID(str(request["fence_token"]))
            generation = int(request["generation"])
            if generation <= 0:
                raise ValueError()
        except Exception:
            return None, "EXECUTION_IDENTITY_INVALID"
        return generation, None

    def _production_output(self, payload):
        operation = payload.get("operation")
        if operation == "SHA256_JSON":
            if "value" not in payload:
                raise ValueError("VALUE_REQUIRED")
            canonical = canonical_json(payload["value"])
            if len(canonical.encode("utf-8")) > 12000:
                raise ValueError("VALUE_TOO_LARGE")
            return {
                "operation": operation,
                "sha256": hashlib.sha256(canonical.encode("utf-8")).hexdigest(),
                "canonical_bytes": len(canonical.encode("utf-8")),
            }
        if operation == "FIBONACCI":
            n = payload.get("n")
            if not isinstance(n, int) or isinstance(n, bool) or n < 0 or n > 5000:
                raise ValueError("N_OUT_OF_RANGE")
            return {"operation": operation, "n": n, "value": str(fibonacci(n))}
        raise ValueError("OPERATION_NOT_ALLOWED")

    def do_POST(self):
        if self.path != "/execute":
            return self._json(404, {"ok": False, "error": "NOT_FOUND"})

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

        generation, identity_error = self._validate_identity(request)
        if identity_error:
            return self._json(400, {"ok": False, "error": identity_error})

        action = request["action_type"]
        request_mode = self.headers.get("X-ASTRA-MODE", "")

        if action in TEST_ACTIONS:
            if request_mode != "TEST_ONLY" or not request["effect_id"].startswith("TEST_ONLY_"):
                return self._json(403, {"ok": False, "error": "TEST_MODE_REQUIRED"})
            output = {
                "echo": request["payload"],
                "executor": SERVICE,
                "version": VERSION,
                "mode": "TEST_ONLY",
            }
        elif action in PRODUCTION_ACTIONS:
            if request_mode != "PRODUCTION":
                return self._json(403, {"ok": False, "error": "PRODUCTION_MODE_REQUIRED"})
            supplied = self.headers.get("X-ASTRA-EXECUTOR-TOKEN", "")
            if not PRODUCTION_TOKEN or not supplied or not hmac.compare_digest(supplied, PRODUCTION_TOKEN):
                return self._json(403, {"ok": False, "error": "PRODUCTION_AUTH_FAILED"})
            try:
                result = self._production_output(request["payload"])
            except ValueError as exc:
                return self._json(400, {"ok": False, "error": str(exc)})
            output = {
                "result": result,
                "executor": SERVICE,
                "version": VERSION,
                "mode": "PRODUCTION",
            }
        else:
            return self._json(403, {"ok": False, "error": "ACTION_NOT_ALLOWED"})

        return self._json(200, {
            "ok": True,
            "status": "SUCCEEDED",
            "effect_id": request["effect_id"],
            "job_id": str(request["job_id"]),
            "generation": generation,
            "fence_token": str(request["fence_token"]),
            "action_type": action,
            "output": output,
        })

if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
