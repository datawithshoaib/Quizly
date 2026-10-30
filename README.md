# Quizly

Generate MCQ quizzes from a topic using a selectable LLM provider (OpenRouter / Gemini / DeepSeek / HuggingFace).

## Tech

- **Backend**: FastAPI, LangChain, LangGraph
- **Frontend**: Next.js (App Router), Tailwind CSS, shadcn/ui components
- **Database**: SQLite

## Setup

1) Copy env file:

- Create `.env` in the repo root based on `.env.example`.

2) Backend (FastAPI)

```bash
cd backend
uv sync   # creates backend/.venv (Python 3.12) from pyproject.toml + uv.lock

# Ensure backend reads your env file:
cp ../.env.example .env
# then edit backend/.env with your keys (or copy your root .env here)

uv run uvicorn app.main:app --reload --port 8000
```

Or start everything from the repo root with `python run.py` (add `--install` to run `uv sync` first).

3) Frontend (Next.js)

```bash
cd frontend
npm install

# Optionally set API base URL:
# export NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

npm run dev
```

Open the UI at `http://localhost:3000`.

## How model selection works

- Users cannot choose a model; the backend picks it from server config.
- Set `LLM_MODEL_ID` to one of the ids in `backend/app/core/models.py` (e.g. `gemini:gemini-3.8-flash`). If unset, the first model whose provider has an API key configured is used.
- Users can enter their own API key for that provider in the form. It is sent as an `X-API-Key` header, used only for that request, and never stored. The field is required when the server has no key for the provider.
- The backend constructs a LangChain model for that provider and composes it with LangChain prompts and output parsers.
- Quiz generation runs as a LangGraph workflow: generate, validate against the Pydantic quiz schema, and repair once if needed.

## Provider notes

- **OpenRouter**: set `OPENROUTER_API_KEY`. Uses `ChatOpenRouter`; the default base URL is `https://openrouter.ai/api/v1`.
- **Gemini**: set `GEMINI_API_KEY`; requests use LangChain's `ChatGoogleGenerativeAI` integration.
- **DeepSeek**: set `DEEPSEEK_API_KEY`; requests use LangChain's `ChatDeepSeek` integration.
- **Hugging Face**: set `HUGGINGFACE_API_KEY`; requests use LangChain's `HuggingFaceEndpoint`. Set `HUGGINGFACE_ENDPOINT_URL` to use a dedicated endpoint.

## API endpoints

- `GET /api/health`
- `GET /api/config` (provider name and whether a server key is set)
- `POST /api/quizzes/generate`
- `GET /api/quizzes/{quiz_id}`
- `POST /api/quizzes/report`

