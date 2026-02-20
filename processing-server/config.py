"""
Configuration module for the Sentinel processing server.
Loads settings from environment variables.
"""
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Configuration settings loaded from environment."""

    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    # NodeODM
    NODEODM_URL: str = os.getenv("NODEODM_URL", "http://localhost:3000")

    # Polling (legacy worker)
    POLL_INTERVAL_SECONDS: int = int(os.getenv("POLL_INTERVAL_SECONDS", "30"))

    # Temp directory
    TEMP_DIR: str = os.getenv("TEMP_DIR", os.path.join(os.path.expanduser("~"), ".sentinel_tmp"))

    # API keys
    PROCESSING_API_KEY: str = os.getenv("PROCESSING_API_KEY", "")
    SENTINEL_API_KEY: str = os.getenv("SENTINEL_API_KEY", "")

    # Lightroom Auto Import
    LIGHTROOM_WATCH_DIR: str = os.getenv("LIGHTROOM_WATCH_DIR", "")
    LIGHTROOM_EXPORT_DIR: str = os.getenv("LIGHTROOM_EXPORT_DIR", "")

    # Construction labeling
    LABEL_FONT_PATH: str = os.getenv("LABEL_FONT_PATH", "")

    # Timeouts (seconds)
    CALLBACK_TIMEOUT: int = int(os.getenv("CALLBACK_TIMEOUT", "3600"))

    # Storage
    STORAGE_BUCKET: str = "drone-jobs"

    # NodeODM processing options
    DEFAULT_OPTIONS: dict = {
        "dsm": True,
        "orthophoto-resolution": 5,
        "mesh-octree-depth": 11,
        "pc-quality": "medium",
        "feature-quality": "high",
    }

    @classmethod
    def validate(cls) -> bool:
        """Validate required configuration is present."""
        errors = []
        if not cls.SUPABASE_URL:
            errors.append("SUPABASE_URL is required")
        if not cls.SUPABASE_SERVICE_ROLE_KEY:
            errors.append("SUPABASE_SERVICE_ROLE_KEY is required")
        if not cls.SENTINEL_API_KEY:
            errors.append("SENTINEL_API_KEY is required")
        for msg in errors:
            print(f"ERROR: {msg}")
        return len(errors) == 0


config = Config()
