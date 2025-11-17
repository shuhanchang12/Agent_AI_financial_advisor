import os
from typing import List, TypedDict, Annotated
import operator

from langchain_core.messages import BaseMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import END, StateGraph
from tavily import TavilyClient
from langfuse.langchain import CallbackHandler

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# --- 1. Initialize Models and Tools ---
tavily_client = TavilyClient(api_key=os.environ["TAVILY_API_KEY"])
llm = ChatOpenAI(model="gpt-4o-mini")
langfuse_handler = CallbackHandler()

# --- 2. Define Agent State ---
# This state will hold the results from each agent's step
class AgentState(TypedDict):
    query: str
    plan: str
    price_verification: str
    vector_retrieval: str
    web_search_results: str
    technical_analysis: str
    macro_analysis: str
    sentiment_analysis: str
    synthesis: str
    critique: str
    final_report: str
    # This will accumulate the formatted conversation
    conversation_history: Annotated[list[str], operator.add]

# --- 3. Define Agent Nodes ---
# Each node simulates an agent, generates a response, and adds it to the conversation history.

async def planner_node(state: AgentState):
    prompt = """You are a financial planning agent. Your role is to create a step-by-step plan to analyze a financial asset based on a user's query.
The user's query is: "{query}"
Create a concise plan. For example: "1) Verify real-time price. 2) Query knowledge base. 3) Search for recent news. 4) Delegate to specialized analysts."
"""
    response = await llm.ainvoke(prompt.format(query=state['query']), config={"callbacks": [langfuse_handler]})
    plan = response.content
    formatted_message = f"**Planner Agent**\n\n{plan}"
    return {"plan": plan, "conversation_history": [formatted_message]}

async def web_search_node(state: AgentState):
    prompt = """You are a web search query generation agent. Based on the user's query and the research plan, create a single, effective search query for the Tavily search engine.
User query: "{query}"
Plan: "{plan}"
Respond with only the search query.
"""
    response = await llm.ainvoke(prompt.format(query=state['query'], plan=state['plan']), config={"callbacks": [langfuse_handler]})
    search_query = response.content
    
    try:
        tavily_response = tavily_client.search(query=search_query, search_depth="basic", max_results=3)
        results = "\n".join([f"- {obj['title']}: {obj['snippet']}" for obj in tavily_response["results"]])
        web_search_results = f"Executing Tavily web search for \"{search_query}\". Key findings:\n{results}"
    except Exception as e:
        web_search_results = f"Error during web search: {e}"

    formatted_message = f"**Web Search Agent (Tavily)**\n\n{web_search_results}"
    return {"web_search_results": web_search_results, "conversation_history": [formatted_message]}

async def technical_analyst_node(state: AgentState):
    prompt = """You are a Technical Analyst agent. Based on the web search results, provide a brief technical analysis.
Mention moving averages, RSI, and key support/resistance levels.
Web Search Results: "{web_search_results}"
"""
    response = await llm.ainvoke(prompt.format(web_search_results=state['web_search_results']), config={"callbacks": [langfuse_handler]})
    technical_analysis = response.content
    formatted_message = f"**Technical Analyst**\n\n{technical_analysis}"
    return {"technical_analysis": technical_analysis, "conversation_history": [formatted_message]}

async def macro_analyst_node(state: AgentState):
    prompt = """You are a Macroeconomic Analyst agent. Based on the web search results, provide a brief macroeconomic analysis.
Mention inflation, interest rates (FOMC), and any relevant economic indicators found in the search.
Web Search Results: "{web_search_results}"
"""
    response = await llm.ainvoke(prompt.format(web_search_results=state['web_search_results']), config={"callbacks": [langfuse_handler]})
    macro_analysis = response.content
    formatted_message = f"**Macro Analyst**\n\n{macro_analysis}"
    return {"macro_analysis": macro_analysis, "conversation_history": [formatted_message]}

async def sentiment_analyst_node(state: AgentState):
    prompt = """You are a Sentiment Analyst agent. Based on the web search results, provide a brief sentiment analysis.
Mention market sentiment indicators (like Fear & Greed if available), social media trends, and news headline tone.
Web Search Results: "{web_search_results}"
"""
    response = await llm.ainvoke(prompt.format(web_search_results=state['web_search_results']), config={"callbacks": [langfuse_handler]})
    sentiment_analysis = response.content
    formatted_message = f"**Sentiment Analyst**\n\n{sentiment_analysis}"
    return {"sentiment_analysis": sentiment_analysis, "conversation_history": [formatted_message]}

async def writer_node(state: AgentState):
    prompt = """You are a Financial Writer agent. Your task is to synthesize all the analyses into a final, comprehensive report.
Combine the findings from the technical, macro, and sentiment analysts.
- Technical Analysis: {technical_analysis}
- Macro Analysis: {macro_analysis}
- Sentiment Analysis: {sentiment_analysis}
- Web Search Results: {web_search_results}

Create a "Final Synthesis" that summarizes the key takeaways and recommended strategy.
"""
    response = await llm.ainvoke(prompt.format(**state), config={"callbacks": [langfuse_handler]})
    synthesis = response.content
    formatted_message = f"**Final Synthesis**\n\n{synthesis}"
    return {"final_report": synthesis, "conversation_history": [formatted_message]}

# --- 4. Define the Graph ---
workflow = StateGraph(AgentState)

# Add nodes
workflow.add_node("planner", planner_node)
workflow.add_node("web_searcher", web_search_node)
workflow.add_node("technical_analyst", technical_analyst_node)
workflow.add_node("macro_analyst", macro_analyst_node)
workflow.add_node("sentiment_analyst", sentiment_analyst_node)
workflow.add_node("writer", writer_node)

# Define edges
workflow.set_entry_point("planner")
workflow.add_edge("planner", "web_searcher")
workflow.add_edge("web_searcher", "technical_analyst")
workflow.add_edge("technical_analyst", "macro_analyst")
workflow.add_edge("macro_analyst", "sentiment_analyst")
workflow.add_edge("sentiment_analyst", "writer")
workflow.add_edge("writer", END)

# --- 5. Compile the graph ---
agent_graph = workflow.compile()

# --- 6. Expose a function to run the graph ---
async def run_agent(query: str):
    """Runs the agent graph with a given user query and returns the full conversation."""
    initial_state: AgentState = {
        "query": query,
        "conversation_history": []
    }
    
    # The final state will contain the complete conversation history
    final_state = await agent_graph.ainvoke(initial_state, config={"callbacks": [langfuse_handler]})
    
    # Join all the formatted messages from the conversation history
    return "\n\n".join(final_state['conversation_history'])
