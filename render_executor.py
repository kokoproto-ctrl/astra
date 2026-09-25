import hashlib
import hmac
import json
import math
import os
import statistics
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SERVICE = "ASTRA_RENDER_EXECUTOR"
VERSION = "1.2.0"
MODE = "PRODUCTION_GATED"
PORT = int(os.environ.get("PORT", "10000"))
MAX_BODY = 65536
TEST_ACTIONS = {"RENDER_ECHO_TEST"}
PRODUCTION_ACTIONS = {"RENDER_COMPUTE_V1"}
PRODUCTION_TOKEN = os.environ.get("ASTRA_RENDER_EXECUTOR_TOKEN", "")
PRODUCTION_OPERATIONS = {
    "BATCH_SHA256_JSON",
    "FIBONACCI",
    "JSON_COMPARE",
    "NUMERIC_STATS",
    "SHA256_JSON",
    "TEXT_ANALYZE",
    "VALIDATE_OBJECT",
}
MAX_DIFF_PATHS = 200
MAX_STATS_VALUES = 5000
MAX_BATCH_ITEMS = 100
MAX_TEXT_BYTES = 48000
MAX_CANONICAL_VALUE_BYTES = 48000


def canonical_json(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def canonical_bytes(value):
    data = canonical_json(value).encode("utf-8")
    if len(data) > MAX_CANONICAL_VALUE_BYTES:
        raise ValueError("VALUE_TOO_LARGE")
    return data


def sha256_json(value):
    data = canonical_bytes(value)
    return hashlib.sha256(data).hexdigest(), len(data)


def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a


def _json_type_name(value):
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, int):
        return "integer"
    if isinstance(value, float):
        return "number"
    if isinstance(value, str):
        return "string"
    if isinstance(value, list):
        return "array"
    if isinstance(value, dict):
        return "object"
    return "unknown"


def _matches_type(value, expected):
    actual = _json_type_name(value)
    if expected == "number":
        return actual in {"integer", "number"} and not isinstance(value, bool)
    return actual == expected


def _diff_json(left, right, path="$", depth=0, out=None):
    if out is None:
        out = []
    if len(out) >= MAX_DIFF_PATHS:
        return out
    if depth > 24:
        out.append({"path": path, "kind": "DEPTH_LIMIT"})
        return out

    left_type = _json_type_name(left)
    right_type = _json_type_name(right)
    if left_type != right_type:
        out.append({"path": path, "kind": "TYPE_CHANGED", "left_type": left_type, "right_type": right_type})
        return out

    if isinstance(left, dict):
        left_keys = set(left)
        right_keys = set(right)
        for key in sorted(left_keys - right_keys):
            if len(out) >= MAX_DIFF_PATHS:
                break
            out.append({"path": f"{path}.{key}", "kind": "REMOVED"})
        for key in sorted(right_keys - left_keys):
            if len(out) >= MAX_DIFF_PATHS:
                break
            out.append({"path": f"{path}.{key}", "kind": "ADDED"})
        for key in sorted(left_keys & right_keys):
            if len(out) >= MAX_DIFF_PATHS:
                break
            _diff_json(left[key], right[key], f"{path}.{key}", depth + 1, out)
        return out

    if isinstance(left, list):
        common = min(len(left), len(right))
        for index in range(common):
            if len(out) >= MAX_DIFF_PATHS:
                break
            _diff_json(left[index], right[index], f"{path}[{index}]", depth + 1, out)
        if len(left) != len(right) and len(out) < MAX_DIFF_PATHS:
            out.append({
                "path": path,
                "kind": "ARRAY_LENGTH_CHANGED",
                "left_length": len(left),
                "right_length": len(right),
            })
        return out

    if left != right:
        out.append({"path": path, "kind": "VALUE_CHANGED"})
    return out


def _numeric_stats(values):
    if not isinstance(values, list) or not values or len(values) > MAX_STATS_VALUES:
        raise ValueError("VALUES_INVALID")
    clean = []
    for value in values:
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValueError("NON_NUMERIC_VALUE")
        value_float = float(value)
        if not math.isfinite(value_float):
            raise ValueError("NON_FINITE_VALUE")
        clean.append(value_float)

    count = len(clean)
    total = math.fsum(clean)
    return {
        "count": count,
        "min": min(clean),
        "max": max(clean),
        "sum": total,
        "mean": total / count,
        "median": statistics.median(clean),
        "pstdev": statistics.pstdev(clean),
    }


def _validate_object(payload):
    value = payload.get("value")
    required = payload.get("required", [])
    allowed = payload.get("allowed")
    types = payload.get("types", {})

    if not isinstance(value, dict):
        raise ValueError("VALUE_NOT_OBJECT")
    if not isinstance(required, list) or any(not isinstance(x, str) or not x for x in required):
        raise ValueError("REQUIRED_INVALID")
    if allowed is not None and (
        not isinstance(allowed, list) or any(not isinstance(x, str) or not x for x in allowed)
    ):
        raise ValueError("ALLOWED_INVALID")
    if not isinstance(types, dict):
        raise ValueError("TYPES_INVALID")

    valid_types = {"null", "boolean", "integer", "number", "string", "array", "object"}
    type_errors = []
    for field, expected in sorted(types.items()):
        if not isinstance(field, str) or not field or expected not in valid_types:
            raise ValueError("TYPE_RULE_INVALID")
        if field in value and not _matches_type(value[field], expected):
            type_errors.append({
                "field": field,
                "expected": expected,
                "actual": _json_type_name(value[field]),
            })

    missing = sorted(set(required) - set(value))
    unexpected = sorted(set(value) - set(allowed)) if allowed is not None else []
    return {
        "valid": not missing and not unexpected and not type_errors,
        "missing": missing,
        "unexpected": unexpected,
        "type_errors": type_errors,
        "field_count": len(value),
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "ASTRA-Render-Executor/1.2.0"

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
                "production_operations": sorted(PRODUCTION_OPERATIONS),
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
            digest, size = sha256_json(payload["value"])
            return {"operation": operation, "sha256": digest, "canonical_bytes": size}

        if operation == "BATCH_SHA256_JSON":
            values = payload.get("values")
            if not isinstance(values, list) or not values or len(values) > MAX_BATCH_ITEMS:
                raise ValueError("VALUES_INVALID")
            results = []
            for index, value in enumerate(values):
                digest, size = sha256_json(value)
                results.append({"index": index, "sha256": digest, "canonical_bytes": size})
            return {"operation": operation, "count": len(results), "results": results}

        if operation == "JSON_COMPARE":
            if "left" not in payload or "right" not in payload:
                raise ValueError("LEFT_RIGHT_REQUIRED")
            left_hash, left_size = sha256_json(payload["left"])
            right_hash, right_size = sha256_json(payload["right"])
            changes = _diff_json(payload["left"], payload["right"])
            return {
                "operation": operation,
                "equal": left_hash == right_hash,
                "left_sha256": left_hash,
                "right_sha256": right_hash,
                "left_canonical_bytes": left_size,
                "right_canonical_bytes": right_size,
                "change_count": len(changes),
                "truncated": len(changes) >= MAX_DIFF_PATHS,
                "changes": changes,
            }

        if operation == "NUMERIC_STATS":
            result = _numeric_stats(payload.get("values"))
            result["operation"] = operation
            return result

        if operation == "TEXT_ANALYZE":
            text = payload.get("text")
            if not isinstance(text, str):
                raise ValueError("TEXT_REQUIRED")
            data = text.encode("utf-8")
            if len(data) > MAX_TEXT_BYTES:
                raise ValueError("TEXT_TOO_LARGE")
            return {
                "operation": operation,
                "bytes": len(data),
                "characters": len(text),
                "lines": 0 if not text else text.count("\n") + 1,
                "words": len(text.split()),
                "sha256": hashlib.sha256(data).hexdigest(),
            }

        if operation == "VALIDATE_OBJECT":
            result = _validate_object(payload)
            result["operation"] = operation
            return result

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
