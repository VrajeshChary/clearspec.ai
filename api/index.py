import sys
import os
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

# Import FastAPI instance
from backend.app.main import app
