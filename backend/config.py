import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    FLASK_ENV = os.environ.get("FLASK_ENV", "production")
    SECRET_KEY = os.environ.get("FLASK_SECRET_KEY")
    PORT = int(os.environ.get("PORT", 5000))

    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    ALLOWED_ORIGINS = [
        o.strip()
        for o in os.environ.get("ALLOWED_ORIGINS", "").split(",")
        if o.strip()
    ]

    @classmethod
    def validate(cls):
        missing = [
            name
            for name in ("SECRET_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")
            if not getattr(cls, name)
        ]
        if missing:
            raise RuntimeError(
                f"Missing required environment variables: {', '.join(missing)}. "
                "Copy .env.example to .env and fill in values."
            )
