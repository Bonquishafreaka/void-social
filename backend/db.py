from supabase import create_client, Client
from config import Config

_client: Client | None = None


def get_client() -> Client:
    """Return a singleton Supabase client using the service role key.

    The service role key bypasses Row Level Security, so this client must
    ONLY ever be used server-side. Never expose it to the frontend.
    """
    global _client
    if _client is None:
        _client = create_client(
            Config.SUPABASE_URL,
            Config.SUPABASE_SERVICE_ROLE_KEY,
        )
    return _client
