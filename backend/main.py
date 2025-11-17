from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
from backend.agent import run_agent
from fastapi.middleware.cors import CORSMiddleware

# Initialize FastAPI app
app = FastAPI(
    title="AI Financial Advisor Backend",
    description="API for running the financial analysis agent graph.",
    version="0.1.0",
)

# Define the origins that are allowed to connect to this backend.
# We'll allow the default Vite dev server port and other common ones.
origins = [
    "http://localhost",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Add CORS middleware to the application.
# This allows the frontend to make requests to the backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

# Pydantic model for the request body
class AnalysisRequest(BaseModel):
    query: str


# Define the /analyze endpoint
@app.post("/analyze")
async def analyze(request: AnalysisRequest):
    """
    Receives a query, runs it through the agent graph, and returns the result.
    """
    try:
        # Run the agent with the user's query
        result = await run_agent(request.query)
        return {"status": "success", "result": result}
    except Exception as e:
        # Basic error handling
        return {"status": "error", "detail": str(e)}

# Optional: Add a root endpoint for health check
@app.get("/")
def read_root():
    return {"status": "online"}

# To run this server, use the command:
# uvicorn backend.main:app --reload
