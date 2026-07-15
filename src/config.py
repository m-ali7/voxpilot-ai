import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE_DIR / "outputs"
OUTPUT_DIR.mkdir(exist_ok=True)

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")

if not ELEVENLABS_API_KEY:
    raise ValueError("Missing ELEVENLABS_API_KEY in .env")

if not ELEVENLABS_VOICE_ID:
    raise ValueError("Missing ELEVENLABS_VOICE_ID in .env")

if not OPENAI_API_KEY:
    raise ValueError("Missing OPENAI_API_KEY in .env")