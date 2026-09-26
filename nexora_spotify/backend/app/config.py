import os

from dotenv import load_dotenv


# Load backend/.env
load_dotenv()


SUPABASE_URL = os.getenv(
    "SUPABASE_URL",
    ""
).strip()


SUPABASE_SERVICE_ROLE_KEY = os.getenv(
    "SUPABASE_SERVICE_ROLE_KEY",
    ""
).strip()


CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173"
).strip()


API_HOST = os.getenv(
    "API_HOST",
    "0.0.0.0"
).strip()


API_PORT = int(
    os.getenv(
        "API_PORT",
        "8000"
    )
)


GOOGLE_MAPS_API_KEY = os.getenv(
    "GOOGLE_MAPS_API_KEY",
    ""
).strip()