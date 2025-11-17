# Multi-Agent Financial Research & Analysis System

A comprehensive multi-agent AI system for financial research that **fully meets all course requirements** including:

- ✅ Multi-agent workflow with LangGraph
- ✅ Vector database (Chroma) with RAG
- ✅ External search tool (Tavily API)
- ✅ Human-in-the-loop approval workflow
- ✅ SQLite persistence across sessions
- ✅ Langfuse monitoring and observability
- ✅ Dynamic routing logic between agents

This project combines a **React/TypeScript frontend** with a **Python LangGraph backend** to deliver production-ready financial analysis powered by multiple specialized AI agents.

## 🎯 Project Overview

This project implements an advanced multi-agent workflow system combining a React frontend with a Python LangGraph backend.

### ✅ Core Features Implemented

- **Multi-agent Workflow**: A team of 9 specialized AI agents collaborate using LangGraph:

  1. **Planner Agent**: Analyzes queries and creates research plans
  2. **Vector Retrieval Agent**: Searches internal knowledge base (Chroma DB)
  3. **Web Search Agent**: Fetches real-time data via Tavily API
  4. **Technical Analyst**: Analyzes price action, indicators, and chart patterns
  5. **Macro Analyst**: Evaluates economic indicators and policy impacts
  6. **Sentiment Analyst**: Assesses market sentiment from news and social trends
  7. **Writer Agent**: Synthesizes all analysis into comprehensive reports
  8. **Critic Agent**: Reviews and improves report quality
  9. **Human Review Node**: Implements human-in-the-loop approval workflow
- **Vector Database (RAG)**: Chroma DB with financial knowledge base for semantic search and retrieval
- **External Search Tool**: Tavily API integration for real-time web search with citations
- **Human-in-the-Loop Approval**: Reports pause at review checkpoint for human approval before finalization
- **State Persistence**: SQLite database with SqliteSaver stores complete workflow state for recovery
- **Langfuse Monitoring**: Complete observability with traces, spans, and performance metrics
- **Dynamic Routing**: LangGraph conditional edges route between agents based on query analysis

## 🏗️ Architecture & Workflow

The system uses LangGraph for sophisticated multi-agent orchestration with dynamic routing.

```
User Input (Ticker + Query)
           ↓
┌─────────────────────┐
│   Planner Agent     │ ← Analyzes query, creates plan, determines routing
└──────────┬──────────┘
           ↓
      [ Router ]
           ↓
   ┌───────┴────────┐
   ↓                ↓
┌─────────┐    ┌─────────┐
│Vector DB│    │   Web   │
│(Chroma) │    │ Search  │
│         │    │(Tavily) │
└────┬────┘    └────┬────┘
     └──────┬───────┘
            ↓
┌──────────────────────────┐
│   Analysis Phase         │
│  (Sequential Pipeline)   │
│                          │
│  Technical Analyst  →    │
│  Macro Analyst      →    │
│  Sentiment Analyst       │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│   Synthesis Phase        │
│                          │
│  Writer Agent       →    │
│  Critic Agent            │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│   Human Review Node ⏸️   │ ← Pause for approval
└──────────┬───────────────┘
           ↓
      [Approved ✅]
           ↓
   [SQLite Storage]
           ↓
  [Langfuse Monitoring]
```

## 🚀 Getting Started

This is a full-stack application with Python backend and React frontend.

### Prerequisites

- Python 3.9 or higher
- Node.js 18 or higher
- API Keys (all have free tiers):
  - OpenAI API key (https://platform.openai.com/api-keys)
  - Tavily API key (https://tavily.com)
  - Langfuse account (https://langfuse.com)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/shuhanchang12/Agent_AI_financial_advisor.git
cd Agent_AI_financial_advisor
```

2. **Install Python dependencies**

```bash
pip install -r requirements.txt
```

3. **Install Node.js dependencies**

```bash
npm install
```

4. **Configure API keys**

Create `backend/.env` file:

```env
OPENAI_API_KEY=your_openai_api_key
TAVILY_API_KEY=your_tavily_api_key
LANGFUSE_PUBLIC_KEY=your_langfuse_public_key
LANGFUSE_SECRET_KEY=your_langfuse_secret_key
LANGFUSE_HOST=https://cloud.langfuse.com
```

5. **Initialize the system**

```bash
python3 init_system.py
```

### Running the Application

**Option 1: Quick Start (Recommended)**

```bash
chmod +x start.sh
./start.sh
```

**Option 2: Manual Start**

Terminal 1 - Backend:

```bash
cd backend
python3 main.py
```

Terminal 2 - Frontend:

```bash
npm run dev
```

**Access Points:**

- Frontend UI: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- Langfuse Dashboard: https://cloud.langfuse.com

## 🔧 Technologies Used

### Backend

- **Python 3.9+**: Core language
- **FastAPI**: Web framework
- **LangChain**: LLM orchestration
- **LangGraph**: Multi-agent workflow engine
- **Chroma**: Vector database
- **Tavily**: Web search API
- **Langfuse**: Observability platform
- **SQLite**: State persistence

### Frontend

- **React 19**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool
- **TailwindCSS**: Styling

### AI/ML

- **OpenAI GPT-4**: Language model
- **OpenAI Embeddings**: Vector embeddings
