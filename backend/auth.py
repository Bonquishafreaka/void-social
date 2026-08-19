from functools import wraps
from flask import request, jsonify, g
from db import get_client


def require_auth(fn):
    """Decorator that validates the Supabase access token on a request.

    The frontend sends the user's access token as `Authorization: Bearer <token>`.
    We verify it against Supabase and attach the user to `g.user`.
    """

    @wraps(fn)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return jsonify({"error": "Missing or malformed Authorization header"}), 401

        token = header.split(" ", 1)[1].strip()
        try:
            result = get_client().auth.get_user(token)
        except Exception:
            return jsonify({"error": "Invalid or expired token"}), 401

        if not result or not getattr(result, "user", None):
            return jsonify({"error": "Invalid or expired token"}), 401

        g.user = result.user
        return fn(*args, **kwargs)

    return wrapper
