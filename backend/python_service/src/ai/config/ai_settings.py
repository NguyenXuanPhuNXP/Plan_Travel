from ai.services.prompt_builder import BASE_DIR
from pathlib import Path
from dotenv import load_dotenv
import os

# Load .env from backend directory (parents[3] if starting from src/ai/config)
load_dotenv(Path(__file__).resolve().parents[4] / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash") # Use stable model by default

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "travel_planner")

PROMPTS_DIR = BASE_DIR / "src" / "ai" / "prompts"

MAX_RETRIEVED_LOCATIONS = 20