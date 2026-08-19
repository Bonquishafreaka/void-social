# Void

A minimal social media platform: static frontend, Flask API, Supabase (Postgres + Auth).

## Architecture

​```
frontend/  → static HTML/JS/CSS. Talks to Supabase for auth, Flask for data.
backend/   → Flask API. Uses the Supabase SERVICE ROLE key server-side only.
supabase/  → SQL schema + Row Level Security policies.
​```

The frontend authenticates against Supabase directly (anon key, safe to expose because RLS is enabled). It sends the user's access token to the Flask backend, which verifies it and performs writes with the service role key. RLS is the safety net so the data is protected even if the frontend is bypassed.

## Setup

### 1. Supabase
1. Create a project at supabase.com.
2. Open the SQL editor and run `supabase/schema.sql`.
3. Grab your Project URL, `anon` key, and `service_role` key from Project Settings → API.

### 2. Backend
​```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # then fill in real values
python app.py
​```

### 3. Frontend
​```bash
cd frontend
cp config.example.js config.js   # then fill in URL + anon key
python -m http.server 8000
​```
Open http://localhost:8000.

## Secrets

Nothing sensitive is committed. Real values live in:
- `backend/.env` (gitignored) — service role key, Flask secret
- `frontend/config.js` (gitignored) — project URL, anon key

Both have `.example` templates with placeholders. The `service_role` key must **never** appear in frontend code.

## Security notes
- RLS is enabled on every table; users can only write/delete their own rows.
- The backend verifies the Supabase JWT on every write.
- CORS is restricted to `ALLOWED_ORIGINS`.
- Post content is length-checked and HTML-escaped on render.
