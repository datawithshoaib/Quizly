# Quizly

Generate MCQ quizzes from a topic using a selectable LLM provider (OpenRouter / Gemini / DeepSeek / HuggingFace).

## Tech

- **Backend**: FastAPI
- **Frontend**: Next.js (App Router)
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
- Each dropdown option maps to a `(provider, provider_model)` pair in `backend/app/llm/registry.py`.
- On generation, the backend picks the right adapter and calls the provider API.

## Provider notes

- **OpenRouter**: set `OPENROUTER_API_KEY`. Default base URL is `https://openrouter.ai/api/v1`.
- **Gemini**: set `GEMINI_API_KEY`. Uses Google’s REST `generateContent` endpoint.
- **DeepSeek**: set `DEEPSEEK_API_KEY`. Uses an OpenAI-compatible chat-completions request.
- **HuggingFace**: set `HUGGINGFACE_API_KEY`. Uses the serverless Inference API; some models may require a dedicated endpoint.

## API endpoints

- `GET /api/health`
- `GET /api/models`
- `POST /api/quizzes/generate`
- `GET /api/quizzes/{quiz_id}`

