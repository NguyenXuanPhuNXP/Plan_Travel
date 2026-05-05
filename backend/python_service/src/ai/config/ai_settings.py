from pathlib import Path
from dotenv import load_dotenv
import os

BASE_DIR = Path(__file__).resolve().parents[2]
DATABASE_ENV_PATH = BASE_DIR / "Database" / ".env"

# Load lại .env từ Database để dùng chung DB config và API key
load_dotenv("Database/.env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "travel_planner")

PROMPTS_DIR = BASE_DIR / "src" / "ai" / "prompts"

MAX_RETRIEVED_LOCATIONS = 20