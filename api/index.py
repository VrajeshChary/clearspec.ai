import sys
import os
import urllib.parse
from pathlib import Path

# Ensure project root is in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Ensure required environment variables have safe defaults
os.environ.setdefault("ENVIRONMENT", "production")
os.environ.setdefault("CONFIDENCE_THRESHOLD", "0.85")

# Initialize statutory SQLite database safely
try:
    from backend.app.services.statutory_db import init_statutory_database
    init_statutory_database()
except Exception as e:
    print(f"Statutory database initialization note: {e}")

from backend.app.main import app as fastapi_app


class VercelPathFixMiddleware:
    """
    ASGI middleware to restore the original request path on Vercel serverless deployments.
    Vercel rewrites /api/... to /api/index.py, which causes scope['path'] to become '/api/index.py'
    instead of the target API endpoint. This middleware extracts the original URL from:
      1. '__vpath' query parameter injected via vercel.json rewrite
      2. 'x-matched-path' HTTP header sent by Vercel edge router
      3. 'x-forwarded-uri' or 'x-now-route-matches'
    and patches scope['path'] and scope['raw_path'] so FastAPI routes correctly without 405 errors.
    """
    def __init__(self, inner_app):
        self.inner_app = inner_app

    async def __call__(self, scope, receive, send):
        if scope.get("type") == "http":
            raw_path = scope.get("path", "")

            # 1. Check query string for __vpath
            qs_bytes = scope.get("query_string", b"")
            real_path = None
            if b"__vpath=" in qs_bytes:
                try:
                    parsed = urllib.parse.parse_qs(qs_bytes.decode("latin1"), keep_blank_values=True)
                    vpath = parsed.pop("__vpath", None)
                    if vpath and vpath[0]:
                        real_path = vpath[0]
                        # Rebuild query_string without __vpath
                        scope["query_string"] = urllib.parse.urlencode(parsed, doseq=True).encode("latin1")
                except Exception:
                    pass

            # 2. Check headers if not found from query string
            if not real_path:
                raw_headers = scope.get("headers", [])
                headers = {}
                for k, v in raw_headers:
                    try:
                        headers[k.decode("latin1").lower()] = v.decode("latin1")
                    except Exception:
                        pass

                real_path = (
                    headers.get("x-matched-path")
                    or headers.get("x-forwarded-uri")
                    or headers.get("x-now-route-matches")
                )

            # 3. If real_path found and raw_path is index.py or ends with .py
            if real_path:
                clean = real_path.split("?")[0]
                if clean and not clean.endswith(".py"):
                    scope["path"] = clean
                    scope["raw_path"] = clean.encode("latin1")
            elif raw_path.endswith("index.py"):
                # Fallback: if path is still /api/index.py, strip /index.py
                scope["path"] = raw_path.replace("/index.py", "") or "/"
                scope["raw_path"] = scope["path"].encode("latin1")

        await self.inner_app(scope, receive, send)


app = VercelPathFixMiddleware(fastapi_app)
