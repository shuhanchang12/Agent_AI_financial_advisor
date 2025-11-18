# 📊 Multi-Agent Financial Research & Analysis — README

This repository contains a production-oriented multi-agent system for financial research and analysis. The system combines a TypeScript React frontend with a Python backend that uses LangGraph to orchestrate multiple specialized AI agents. It includes vector retrieval (Chroma), real-time web search (Tavily), human-in-the-loop approval, persistent state via SQLite, and observability through Langfuse.

## 📚 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Quickstart](#quickstart)
- [Project Layout](#project-layout)
- [Observability & Persistence](#observability--persistence)
- [Notes](#notes)
- [License](#license)

Key highlights:

- Multi-agent workflow driven by LangGraph
- Retrieval-Augmented Generation (RAG) with Chroma vector database
- External web search using the Tavily API (with citations)
- Human-in-the-loop review and approval nodes
- Session/state persistence via SQLite
- Monitoring and tracing via Langfuse

<a id="features"></a>
## 🧩 Features

- Planner Agent: analyzes incoming queries and builds a research plan.
- Retrieval Agent: semantic search against the Chroma knowledge base.
- Web Search Agent: fetches up-to-date information using Tavily.
- Technical, Macro, and Sentiment Analysts: produce specialized insights.
- Writer Agent and Critic Agent: synthesize and refine final reports.
- Human Review Node: pauses workflow for human approval before finalizing.
- Langfuse integration for observability (traces, spans, metrics).

<a id="architecture"></a>
## 🏗️ Architecture — Boxed Workflow Diagram

The diagram below uses square boxes to show the main program workflow and side services.

```
+------------------------------+
| Frontend (React / TypeScript) 🖥️ |
+------------------------------+
		 |
		 v
+------------------------------+
| Backend API (FastAPI) ⚙️     |
+------------------------------+
		 |
		 v
+------------------------------+
| LangGraph Orchestrator 🔁     |
+------------------------------+
	|            |           
	v            v           v
+-------------+ +-------------+ +-------------+
| Retrieval   | | Web Search  | | Analysis    |
| (Chroma) 🔍 | | (Tavily) 🌐 | | Agents 🧠   |
+-------------+ +-------------+ +-------------+
			 |
			 v
+------------------------------+
| Writer ✍️  -> Critic 🛡️      |
+------------------------------+
		 |
		 v
+------------------------------+
| Human Review (pause & action) 👥 |
+------------------------------+
		 |
		 v
+------------------------------+
| Persist (SQLite) 💾          |
+------------------------------+

Side services: Langfuse (observability) 📊, Logs 📝
```

If you prefer, I can also add a Mermaid diagram or generate a PNG/SVG version of this boxed diagram and include it in the repo.

<a id="quickstart"></a>
## 🚀 Quickstart

Prerequisites:

- Python 3.9+
- Node.js 18+
- API keys: OpenAI, Tavily, Langfuse (optional for telemetry)

1. Clone the repository

```bash
git clone https://github.com/shuhanchang12/Agent_AI_financial_advisor.git
cd Agent_AI_financial_advisor/final_ai_trading_copilot
```

2. Install backend dependencies

```bash
cd backend
pip install -r requirements.txt
```

3. Install frontend dependencies

```bash
cd ../
npm install
```

4. Add environment variables

Create `backend/.env` (or set system env variables):

```env
OPENAI_API_KEY=your_openai_api_key
TAVILY_API_KEY=your_tavily_api_key
LANGFUSE_PUBLIC_KEY=your_langfuse_public_key
LANGFUSE_SECRET_KEY=your_langfuse_secret_key
LANGFUSE_HOST=https://cloud.langfuse.com
```

5. Initialize (if applicable)

```bash
python3 backend/init_system.py
```

6. Start services

Backend (API):

```bash
cd backend
python3 main.py
```

Frontend (development server):

```bash
cd ../
npm run dev
```

Default access points:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API docs (FastAPI): http://localhost:8000/docs

<a id="project-layout"></a>
## 🗂️ Project Layout

- `backend/` — Python backend (FastAPI, LangGraph orchestration, agents)
- `src/` — React + TypeScript frontend
- `package.json`, `vite.config.ts` — frontend build configuration
- `Dockerfile.*`, `docker-compose.yml` — containerization and deployment

### Project Structure (current folder tree)

```
final_ai_trading_copilot/
├─ .dockerignore
├─ .gitignore
├─ DEPLOYMENT_GUIDE.md
├─ Dockerfile.backend
├─ Dockerfile.frontend
├─ PRESENTATION_10MIN_3PEOPLE.md
├─ Proof Alpha Vantage API Connexion (Stock Price).png
├─ Proof Back end Deployment.png
├─ Proof Front end Deployment.png
├─ Proof LangFuse.mov
├─ Proof UI.mov
├─ README.docx
├─ README.md
├─ backend/
│  ├─ agent.py
│  ├─ main.py
│  └─ requirements.txt
├─ docker-compose.yml
├─ index.css
├─ index.html
├─ package-lock.json
├─ package.json
├─ render.yaml
├─ src/
│  ├─ App.tsx
│  ├─ components/
│  │  ├─ ChatInterface.tsx
│  │  └─ MarketHeader.tsx
│  ├─ index.css
│  ├─ index.tsx
│  ├─ services/
│  │  └─ geminiService.ts
│  └─ types.ts
├─ tsconfig.json
├─ vercel.json
└─ vite.config.ts
```

This tree reflects the repository contents in the `final_ai_trading_copilot` folder at the time of editing. Let me know if you want this expanded to include file descriptions or links to key files.

<a id="observability--persistence"></a>
## 🔍💾 Observability & Persistence

- State is stored in SQLite for session persistence and reproducibility.
- Langfuse is used to collect traces and metrics for each agent execution.

<a id="notes"></a>
## ℹ️ Notes

- Tavily provides web search results and citations. Be mindful of rate limits and API usage quotas.
- Langfuse keys are optional but recommended for production observability.

<a id="license"></a>
## 📜 License

This project is provided for academic and demonstration purposes. Review the original repository license for reuse terms.

---
If you need the README tailored for a specific audience (developer, instructor, or deployer), tell me which audience and I'll produce a variant.
