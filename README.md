# Quizly

Generate MCQ quizzes from a topic using your own LLM API key: Groq (default) or OpenRouter.

## Tech

- **Backend**: FastAPI, LangChain, LangGraph
- **Frontend**: Next.js (App Router), Tailwind CSS, shadcn/ui components
- **Database**: SQLite

## Setup

1) Backend (FastAPI)

```bash
cd backend
uv sync   # creates backend/.venv (Python 3.12) from pyproject.toml + uv.lock
cp .env.example .env   # CORS/database settings; no LLM keys needed
uv run uvicorn app.main:app --reload --port 8000
```

2) Frontend (Next.js)

```bash
cd frontend
npm install
cp .env.example .env.local   # optional; defaults to http://localhost:8000
npm run dev
```

Or start everything from the repo root with `python run.py` (add `--install` to run `uv sync` first).

Open the UI at `http://localhost:3000`.

## Environment files

| File | Used by | Notes |
| --- | --- | --- |
| `backend/.env` | FastAPI | CORS, database. Template: `backend/.env.example`. |
| `frontend/.env.local` | Next.js | `NEXT_PUBLIC_API_BASE_URL`. Template: `frontend/.env.example`. |

Neither file is committed. In production, set the same variables in the Render and Vercel dashboards.

## Deployment

The backend goes on **Render** and the frontend on **Vercel**. Deploy the backend first, because the frontend needs its URL.

### 1. Backend on Render

1. Push this repo to GitHub.
2. In Render: **New → Blueprint**, then pick the repo. Render reads [`render.yaml`](render.yaml), which creates the `quizly-backend` web service from `backend/`:
   - Build: `pip install uv && uv sync --frozen --no-dev`
   - Start: `uv run --no-sync uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Health check: `/api/health`
3. No LLM keys are needed on the server: users enter their own. You can leave `FRONTEND_ORIGIN` blank for now.
4. After the deploy finishes, copy the service URL, e.g. `https://quizly-backend.onrender.com`. Check that `https://<service>.onrender.com/api/health` returns `{"status":"ok"}`.

Notes:
- **Database**: the default SQLite file is on Render's ephemeral disk, so it is wiped on every deploy and restart. The app only uses saved quizzes for history, so this is fine to start with. For persistent storage, create a Render Postgres instance (or use Neon/Supabase) and set `DATABASE_URL` to its connection string. `postgres://` URLs are handled automatically.
- **Cold starts**: free Render services sleep after ~15 minutes idle, so the first request after that can take up to a minute.

### 2. Frontend on Vercel

1. In Vercel: **Add New → Project**, then import the repo.
2. Set **Root Directory** to `frontend`. Vercel detects Next.js on its own.
3. Add an environment variable: `NEXT_PUBLIC_API_BASE_URL` = your Render URL, with no trailing slash.
4. Deploy, and copy the production URL, e.g. `https://quizly.vercel.app`.

`NEXT_PUBLIC_*` variables are baked in at build time. If you change it, redeploy the frontend.

### 3. Connect them (CORS)

Back in Render → `quizly-backend` → **Environment**:

- `FRONTEND_ORIGIN` = your Vercel URL, e.g. `https://quizly.vercel.app`. To allow several origins, separate them with commas. Don't add a trailing slash.
- Optional: `FRONTEND_ORIGIN_REGEX` = `https://quizly-.*\.vercel\.app` to also allow Vercel preview deployments.

Save. Render redeploys on its own.

## How model selection works

- The server holds no LLM API keys, so it never incurs model costs. Each user enters their own key in the form.
- Users pick the provider: **Groq** (default) or **OpenRouter**. They cannot choose a model; both providers use `openai/gpt-oss-120b` (set in `backend/app/core/models.py`).
- The key is sent as an `X-API-Key` header and the provider as `X-LLM-Provider` (`groq` or `openrouter`). The key is used only for that request and never stored.
- The backend constructs a LangChain model for that provider (`ChatGroq` or `ChatOpenRouter`) and composes it with LangChain prompts and output parsers.
- Quiz generation runs as a LangGraph workflow: generate, validate against the Pydantic quiz schema, and repair once if needed.

Get a key at [console.groq.com/keys](https://console.groq.com/keys) or [openrouter.ai/keys](https://openrouter.ai/keys).

## API endpoints

- `GET /api/health`
- `GET /api/config` (available providers and the default one)
- `POST /api/quizzes/generate`
- `GET /api/quizzes/{quiz_id}`
- `POST /api/quizzes/report`

