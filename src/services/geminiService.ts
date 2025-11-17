import axios from 'axios';
import { AnalysisReport, ChatRole, ChatMessage, QuantStrategy } from '../types';

const API_URL = 'http://127.0.0.1:8004';

// This will store the full analysis result in memory to simulate polling
interface SessionState {
  fullReportText: string;
  parsedMessages: ChatMessage[];
  step: number;
  isFinished: boolean;
  ticker: string;
  query: string;
  report: AnalysisReport | null;
}

// We'll use a simple in-memory object to act as our "session" storage
const sessionStore: Record<string, SessionState> = {};

// Helper to parse the raw text from the backend into structured messages
const parseAnalysisText = (text: string): ChatMessage[] => {
  if (typeof text !== 'string') {
    console.error("Parsing failed: input is not a string.", text);
    return [{ role: 'Critic', content: 'Error: Received invalid data from backend.' }];
  }
  if (text.startsWith("Error:")) {
    return [{ role: 'Critic', content: text }];
  }
  const sections = text.split(/\n\n(?=\*\*)/);
  const messages: ChatMessage[] = [];
  sections.forEach(section => {
    const match = section.match(/\*\*(.*?)\*\*/);
    if (match) {
      // Allow for a broader range of roles by casting, as the backend dictates the roles
      const role = match[1].replace(' Agent', '').replace(' (Tavily)', '').trim() as ChatRole;
      const content = section.substring(match[0].length).trim();
      messages.push({ role, content });
    }
  });
  return messages.length > 0 ? messages : [{ role: 'Writer', content: text }];
};

/**
 * Initiates the analysis. It doesn't call the backend directly but sets up the state for polling.
 */
export const runAnalysis = async (ticker: string, query: string, file: File | null): Promise<{ thread_id: string }> => {
  console.log(`[Service] runAnalysis called for ${ticker}. Staging for polling.`);
  const thread_id = `thread_${Date.now()}`;
  
  // Initialize the state for this new analysis thread
  sessionStore[thread_id] = {
    fullReportText: '',
    parsedMessages: [],
    step: 0,
    isFinished: false,
    ticker,
    query,
    report: null,
  };
  
  // We don't need the file for this implementation, but keep the signature
  if (file) {
    console.log(`File received: ${file.name}, but it will not be used in this flow.`);
  }

  return Promise.resolve({ thread_id });
};

/**
 * This function is polled by the frontend. It orchestrates fetching the data and delivering it incrementally.
 */
export const getAnalysisState = async (threadId: string): Promise<{ report: AnalysisReport }> => {
  const state = sessionStore[threadId];
  if (!state) {
    throw new Error("Analysis session not found. Please start a new analysis.");
  }

  // --- Step 1: Fetch the full report from the backend, but only ONCE ---
  if (state.step === 0) {
    console.log(`[Service] First poll for ${threadId}. Calling the real backend...`);
    try {
      const response = await axios.post<{ analysis: string }>(
        `${API_URL}/analyze`,
        { query: state.query, ticker: state.ticker },
        { headers: { 'Content-Type': 'application/json' } }
      );
      state.fullReportText = response.data.analysis;
      state.parsedMessages = parseAnalysisText(state.fullReportText);
      console.log(`[Service] Backend response received and parsed into ${state.parsedMessages.length} messages.`);
    } catch (error) {
      let errorMessage = 'An unexpected error occurred.';
      if (axios.isAxiosError(error)) {
        errorMessage = error.code === 'ERR_NETWORK'
          ? "Error: Could not connect to the analysis server. Please ensure it's running on port 8004."
          : `Error: The server responded with ${error.response?.status}.`;
      }
      // Store the error to be displayed
      state.parsedMessages = [{ role: 'Critic', content: errorMessage }];
      state.isFinished = true;
    }
  }

  // --- Step 2: Deliver the messages one by one on each poll call ---
  if (state.step < state.parsedMessages.length) {
    state.step += 1;
  } else if (state.parsedMessages.length > 0) {
    state.isFinished = true;
  }

  const currentDebate = state.parsedMessages.slice(0, state.step);
  const finalStatus = state.isFinished ? 'Human_Review' : 'Running';

  // Construct the report object that App.tsx expects
  // If the report object already exists, we update it, otherwise create it.
  if (!state.report) {
    state.report = {
        id: threadId,
        ticker: state.ticker.toUpperCase(),
        query: state.query,
        currentPrice: 'N/A',
        dataHealth: { status: 'Stale', assetClass: 'Unknown', dataSource: 'Backend Analysis', price: 'N/A', timestamp: new Date().toISOString(), latency: '...' },
        synthesis: '',
        analysisDebate: [],
        quantStrategy: { params: { rsi_oversold: 30, rsi_overbought: 70, stop_loss_percent: 5, take_profit_percent: 10 }, report: 'Quant analysis not implemented in this flow.' },
        executiveSummary: '',
        status: 'Running',
    };
  }
  
  state.report.analysisDebate = currentDebate;
  state.report.status = finalStatus;
  state.report.synthesis = state.isFinished ? (state.parsedMessages.find(m => m.role === 'Final Synthesis')?.content || 'See debate.') : 'Analysis in progress...';
  state.report.executiveSummary = state.isFinished ? 'Review the final synthesis and debate.' : 'Running...';


  return Promise.resolve({ report: state.report });
};

// --- Dummy implementations for other functions that App.tsx might call ---

export const approveReport = async (threadId: string, feedback: string): Promise<{ status: string }> => {
  console.log(`[Service] approveReport called for ${threadId} with feedback: "${feedback}". (Dummy)`);
  const state = sessionStore[threadId];
  if (state && state.report) {
      state.report.status = 'Approved';
  }
  return Promise.resolve({ status: 'approved' });
};

export const recalculateStrategy = async (threadId: string, params: QuantStrategy['params']): Promise<{ quantStrategy: QuantStrategy }> => {
  console.log(`[Service] recalculateStrategy called for ${threadId} with params:`, params, "(Dummy)");
  const state = sessionStore[threadId];
  const dummyReport: QuantStrategy = {
      params,
      report: `Recalculation simulated for RSI: ${params.rsi_oversold}/${params.rsi_overbought}. This is a dummy response.`
  };
  if (state && state.report) {
      state.report.quantStrategy = dummyReport;
  }
  return Promise.resolve({ quantStrategy: dummyReport });
};

export const chatWithCoPilot = async (threadId: string, message: string): Promise<{ report: AnalysisReport }> => {
    console.log(`[Service] chatWithCoPilot called for ${threadId} with message: "${message}". (Dummy)`);
    const state = sessionStore[threadId];
    if (!state || !state.report) {
        throw new Error("Cannot chat on a non-existent report.");
    }
    
    const userMessage: ChatMessage = { role: 'User', content: message };
    const coPilotResponse: ChatMessage = { role: 'Co-Pilot', content: "I am a dummy Co-Pilot. I cannot process your request, but I have recorded your message." };
    
    state.report.analysisDebate.push(userMessage, coPilotResponse);
    
    // Return the updated report state
    return Promise.resolve({ report: state.report });
};
