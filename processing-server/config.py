"""
Configuration module for the photogrammetry worker.
Loads settings from environment variables.
"""
import os
from dotenv import load_dotenv

# Load .env file if present
load_dotenv()


class Config:
    """Configuration settings loaded from environment."""
    
    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    # NodeODM
    NODEODM_URL: str = os.getenv("NODEODM_URL", "http://localhost:3000")
    
    # Polling
    POLL_INTERVAL_SECONDS: int = int(os.getenv("POLL_INTERVAL_SECONDS", "30"))
    
    # Temp directory
    TEMP_DIR: str = os.getenv("TEMP_DIR", "")
    
    # Processing API key (for webhook callback security)
    PROCESSING_API_KEY: str = os.getenv("PROCESSING_API_KEY", "")
    
    # Storage bucket name
    STORAGE_BUCKET: str = "drone-jobs"
    
    # NodeODM processing options
    DEFAULT_OPTIONS: dict = {
        "dsm": True,
        "orthophoto-resolution": 5,  # cm/pixel
        "mesh-octree-depth": 11,
        "pc-quality": "medium",
        "feature-quality": "high",
    }
    
    @classmethod
    def validate(cls) -> bool:
        """Validate required configuration is present."""
        if not cls.SUPABASE_URL:
            print("ERROR: SUPABASE_URL is required")
            return False
        if not cls.SUPABASE_SERVICE_ROLE_KEY:
            print("ERROR: SUPABASE_SERVICE_ROLE_KEY is required")
            return False
        return True


config = Config()
