from flask import Flask, request, jsonify, g
from flask_cors import CORS

from config import Config
from db import get_client
from auth import require_auth

Config.validate()

app = Flask(__name__)
app.config.from_object(Config)

CORS(
    app,
    origins=Config.ALLOWED_ORIGINS,
    supports_credentials=True,
)

MAX_POST_LENGTH = 500


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.get("/api/posts")
def list_posts():
    """Public feed — most recent posts first."""
    client = get_client()
    resp = (
        client.table("posts")
        .select("id, content, created_at, user_id, profiles(username)")
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return jsonify(resp.data)


@app.post("/api/posts")
@require_auth
def create_post():
    body = request.get_json(silent=True) or {}
    content = (body.get("content") or "").strip()

    if not content:
        return jsonify({"error": "Content is required"}), 400
    if len(content) > MAX_POST_LENGTH:
        return jsonify({"error": f"Content exceeds {MAX_POST_LENGTH} characters"}), 400

    client = get_client()
    resp = (
        client.table("posts")
        .insert({"content": content, "user_id": g.user.id})
        .execute()
    )
    return jsonify(resp.data[0]), 201


@app.delete("/api/posts/<post_id>")
@require_auth
def delete_post(post_id):
    client = get_client()
    existing = (
        client.table("posts").select("user_id").eq("id", post_id).single().execute()
    )
    if not existing.data:
        return jsonify({"error": "Post not found"}), 404
    if existing.data["user_id"] != g.user.id:
        return jsonify({"error": "Not authorized to delete this post"}), 403

    client.table("posts").delete().eq("id", post_id).execute()
    return jsonify({"deleted": post_id})


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=Config.PORT,
        debug=Config.FLASK_ENV == "development",
    )
