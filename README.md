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
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Ensure backend reads your env file:
cp ../.env.example .env
# then edit backend/.env with your keys (or copy your root .env here)

uvicorn app.main:app --reload --port 8000
```

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

- The frontend dropdown is populated from `GET /api/models`.
- Each dropdown option maps to a `(provider, provider_model)` pair in `backend/app/core/models.py`.
- The backend constructs a LangChain model for the selected provider and composes it with LangChain prompts and output parsers.
- Quiz generation runs as a LangGraph workflow: generate, validate against the Pydantic quiz schema, and repair once if needed.

## Provider notes

- **OpenRouter**: set `OPENROUTER_API_KEY`. Uses `ChatOpenRouter`; the default base URL is `https://openrouter.ai/api/v1`.
- **Gemini**: set `GEMINI_API_KEY`; requests use LangChain's `ChatGoogleGenerativeAI` integration.
- **DeepSeek**: set `DEEPSEEK_API_KEY`; requests use LangChain's `ChatDeepSeek` integration.
- **Hugging Face**: set `HUGGINGFACE_API_KEY`; requests use LangChain's `HuggingFaceEndpoint`. Set `HUGGINGFACE_ENDPOINT_URL` to use a dedicated endpoint.

## API endpoints

- `GET /api/health`
- `GET /api/models`
- `POST /api/quizzes/generate`
- `GET /api/quizzes/{quiz_id}`
- `POST /api/quizzes/report`

