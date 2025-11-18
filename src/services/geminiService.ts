// Fix: Import `ChatRole` to resolve type error for agent roles.
import { AnalysisReport, ChatRole, QuantStrategy } from '../types';

// Fix: Augment the `Window` type to allow for the `mockState` property used by the mock API.
declare global {
  interface Window {
    mockState: any;
  }
}

export interface PriceInfo {
    price: number | null;
    dataSource: string;
}

const ALPHA_VANTAGE_API_KEY = 'RW0ZMMPONQCECUM1';

const getAssetClass = (ticker: string): { assetClass: string, isStock: boolean, isCrypto: boolean } => {
    const upperTicker = ticker.toUpperCase();
    if (upperTicker.includes('/USD')) {
        return { assetClass: 'Cryptocurrency', isStock: false, isCrypto: true };
    }
    if (upperTicker.length <= 5 && /^[A-Z]+$/.test(upperTicker)) {
        return { assetClass: 'Equity', isStock: true, isCrypto: false };
    }
    return { assetClass: 'Commodity/Other', isStock: false, isCrypto: false };
};

const getRealTimePrice = async (ticker: string): Promise<PriceInfo> => {
    const trimmedTicker = ticker.trim();
    const { isStock, isCrypto } = getAssetClass(trimmedTicker);
    const upperTicker = trimmedTicker.toUpperCase();

    try {
        if (isCrypto) {
            const cryptoIdMap: { [key: string]: string } = {
                'BTC/USD': 'bitcoin',
                'ETH/USD': 'ethereum',
            };
            const coingeckoId = cryptoIdMap[upperTicker];
            if (!coingeckoId) {
                throw new Error(`Unsupported cryptocurrency ticker for live data: ${ticker}.`);
            }

            const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`);
            if (!response.ok) {
                throw new Error(`Live data API (CoinGecko) request failed with status ${response.status}.`);
            }
            const data = await response.json();
            const price = data[coingeckoId]?.usd;

            if (typeof price !== 'number') {
                throw new Error('Invalid or missing price data from CoinGecko API.');
            }
            return { price, dataSource: 'CoinGecko (Live)' };
        }

        if (isStock) {
            console.log(`[API] Fetching real-time price for stock: ${ticker}`);
            const response = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${upperTicker}&apikey=${ALPHA_VANTAGE_API_KEY}`);
            if (!response.ok) {
                console.error(`[API Error] The live data API (Alpha Vantage) returned HTTP Status: ${response.status}.`);
                return { price: null, dataSource: 'Live Data Unavailable' };
            }
            const data = await response.json();

            // Handle known API limit/error messages gracefully with warnings
            if (data?.Information) {
                console.warn(`[API Warn] Alpha Vantage (stock price): ${data.Information}`);
                return { price: null, dataSource: 'Live Data Unavailable' };
            }
            if (data?.Note) {
                console.warn(`[API Warn] Alpha Vantage (stock price): ${data.Note}`);
                return { price: null, dataSource: 'Live Data Unavailable' };
            }
            if (data?.['Error Message']) {
                console.warn(`[API Warn] Alpha Vantage (stock price): ${data['Error Message']}`);
                return { price: null, dataSource: 'Live Data Unavailable' };
            }

            // Attempt to parse the expected data structure
            const quote = data?.['Global Quote'];
            if (quote && quote['05. price']) {
                const price = parseFloat(quote['05. price']);
                if (!isNaN(price)) {
                    console.log(`[API] Fetched price for ${ticker}: ${price.toFixed(2)}`);
                    return { price, dataSource: 'Alpha Vantage (Live)' };
                }
            }
            
            // If we reach here, the data format was unexpected
            console.warn(`[API Warn] Could not parse a valid price for "${ticker}" from Alpha Vantage. The response format may have changed.`);
            console.log("[API Response]", JSON.stringify(data, null, 2));
            return { price: null, dataSource: 'Live Data Unavailable' };
        }
        
        console.warn(`Live price data is not supported for this asset type: ${ticker}.`);
        return { price: null, dataSource: 'Live Data Unavailable' };

    } catch (error) {
        // This will now catch network errors, JSON parsing errors, or bugs in the logic
        console.error(`[API Error] An unexpected error occurred while fetching the price for ${ticker}:`, error);
        return { price: null, dataSource: 'Live Data Unavailable' };
    }
};

interface AnalysisResponse {
    thread_id: string;
    // The backend might send an initial state immediately
    report?: AnalysisReport;
}

interface StateResponse {
    report: AnalysisReport;
}

// Helper function to simulate quant recalculation, to be used by both recalculate and chatWithCoPilot
const simulateRecalculation = (params: QuantStrategy['params']): QuantStrategy['report'] => {
    const baseWinRate = 60;
    const baseSharpe = 1.2;
    const baseDrawdown = -16;
    const rsiSpread = params.rsi_overbought - params.rsi_oversold;
    const winRate = baseWinRate + (50 - rsiSpread);
    const sharpe = baseSharpe + (5 - params.stop_loss_percent) * 0.1;
    const drawdown = baseDrawdown + (params.stop_loss_percent - 5);
    return `**Strategy:** RSI Mean Reversion (Custom)\n**Win Rate:** ${winRate.toFixed(1)}%\n**Sharpe Ratio:** ${sharpe.toFixed(2)}\n**Max Drawdown:** ${drawdown.toFixed(1)}%`;
};

// Helper to parse the raw text from the backend into structured messages
const parseAnalysisText = (text: string): any[] => {
  if (typeof text !== 'string') {
    console.error("Parsing failed: input is not a string.", text);
    return [{ role: 'Critic', content: 'Error: Received invalid data from backend.' }];
  }
  if (text.startsWith("Error:")) {
    return [{ role: 'Critic', content: text }];
  }
  
  const messages: any[] = [];
  
  // Map of agent identifiers to ChatRole
  const agentRoleMap: { [key: string]: any } = {
    'Planner': 'Planner',
    'Price Verification': 'Price Verification',
    'Vector Retrieval': 'Vector Retrieval',
    'Web Search': 'Web Search',
    'Technical': 'Technical',
    'Macro': 'Macro',
    'Sentiment': 'Sentiment',
    'Writer': 'Writer',
    'Critic': 'Critic'
  };
  
  // Split by double newlines to get sections
  const sections = text.split(/\n\n+/);
  
  sections.forEach(section => {
    const trimmedSection = section.trim();
    if (!trimmedSection) return;
    
    // Check for **Agent Name** pattern
    const match = trimmedSection.match(/\*\*([^*]+)\*\*(.+)/s);
    if (match) {
      let agentName = match[1].trim();
      const content = match[2].trim();
      
      // Clean up agent name
      agentName = agentName.replace(/\s+Agent\s*/gi, '')
                           .replace(/\s+\(Tavily\)\s*/gi, '')
                           .trim();
      
      // Map to proper role
      let role = 'Writer';
      for (const [key, value] of Object.entries(agentRoleMap)) {
        if (agentName.toLowerCase().includes(key.toLowerCase())) {
          role = value;
          break;
        }
      }
      
      if (content && content.length > 0) {
        messages.push({ role, content });
      }
    }
  });
  
  // If no messages were parsed, create a default structure
  if (messages.length === 0) {
    const defaultAgents: any[] = [
      { role: 'Planner', content: text.substring(0, 200) || 'Analyzing...' }
    ];
    return defaultAgents;
  }
  
  return messages;
};

// A mock function to simulate the backend. In a real scenario, this would make fetch requests.
const mockApi = {
    async runAnalysis(ticker: string, query: string, file: File | null): Promise<AnalysisResponse> {
        console.log(`[Frontend->Backend] Starting analysis for ${ticker} with query: "${query}" and file: ${file?.name || 'none'}`);
        const thread_id = `thread_${Date.now()}`;
        
        if (!window.mockState) window.mockState = {};
        // Use a separate property to store initial data to be picked up by getAnalysisState
        // FIX: Corrected typo from `mockstate` to `mockState`.
        if (!window.mockState.initialData) window.mockState.initialData = {};

        const { price, dataSource } = await getRealTimePrice(ticker);
        const formattedPrice = price !== null
            ? price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
            : 'N/A';
        const { assetClass } = getAssetClass(ticker);

        window.mockState.initialData[thread_id] = {
            ticker,
            query,
            formattedPrice,
            assetClass,
            dataSource,
            fileName: file ? file.name : null
        };
        
        return { thread_id };
    },
    async getAnalysisState(threadId: string): Promise<StateResponse> {
        // This is a mock. A real implementation would fetch from `${API_BASE_URL}/api/state/${threadId}`
        // This mock will simulate the agent debate process over time.
        console.log(`[Frontend->Backend] Fetching state for ${threadId}`);
        
        // Lazy initialization of mock state
        if (!window.mockState) window.mockState = {};
        if (!window.mockState[threadId]) {
            // Use the initial data prepared by runAnalysis to create a more realistic report
            // Fix: Corrected typo from `mockmockState` to `mockState`.
            const initialData = window.mockState.initialData?.[threadId] || { 
                ticker: 'SIMULATED', 
                query: 'Simulating analysis...', 
                formattedPrice: '$1.00', 
                assetClass: 'Simulated',
                dataSource: 'Simulation',
                fileName: null
            };

            const dataStatus = initialData.dataSource.includes('(Live)') ? 'Verified' : 'Stale';
            
             window.mockState[threadId] = {
                step: 0,
                report: {
                    id: threadId,
                    ticker: initialData.ticker.toUpperCase(),
                    query: initialData.query,
                    currentPrice: initialData.formattedPrice,
                    dataHealth: { 
                        status: dataStatus, 
                        assetClass: initialData.assetClass, 
                        dataSource: initialData.dataSource, 
                        price: initialData.formattedPrice, 
                        timestamp: new Date().toLocaleString('sv-SE'), 
                        latency: `${Math.floor(Math.random() * 40 + 10)}ms`
                    },
                    synthesis: '',
                    analysisDebate: [],
                    quantStrategy: { params: { rsi_oversold: 30, rsi_overbought: 70, stop_loss_percent: 5, take_profit_percent: 10 }, report: 'Awaiting analysis...' },
                    executiveSummary: '',
                    status: 'Running'
                }
            };
        }
        
        const state = window.mockState[threadId];
        const formattedPrice = state.report.dataHealth.price;
        const dataSource = state.report.dataHealth.dataSource;
        const numericPrice = parseFloat(state.report.currentPrice.replace(/[$,]/g, '')) || 100; // Fallback to 100 if parsing fails
        const initialData = window.mockState.initialData?.[threadId] || {};
        const fileName = initialData.fileName;

        const priceVerificationMessage = state.report.dataHealth.status === 'Verified'
            ? `Confirmed real-time price for ${state.report.ticker} is ${formattedPrice} via ${dataSource}. Proceeding with analysis at this price point.`
            : `Could not retrieve a reliable real-time price for ${state.report.ticker} from the source: ${dataSource}. The analysis will proceed, but it will be based on stale or placeholder data, which may affect its accuracy.`;
        
        const vectorRetrievalContent = fileName
            ? `Querying user-provided document "${fileName}" in combination with the internal vector database for "${state.report.ticker}". Retrieved 4 relevant documents: 1) "${fileName}", 2) "Q2 2024 Earnings Call Transcript", 3) "Valuation Model: Discounted Cash Flow Analysis (Updated July 2024)", and 4) "Risk Assessment: Competitive Landscape".`
            : `Querying internal vector database for "${state.report.ticker}". Retrieved 3 relevant documents: 1) "Q2 2024 Earnings Call Transcript", 2) "Valuation Model: Discounted Cash Flow Analysis (Updated July 2024)", and 3) "Risk Assessment: Competitive Landscape".`;

        const vectorRetrievalCitations = fileName
            ? [{uri: '#', title: `User Document: ${fileName}`}, {uri: '#', title: 'DocID: Q2_2024_Earnings_Transcript'}, {uri: '#', title: 'DocID: DCF_Model_July_2024'}, {uri: '#', title: 'DocID: Risk_Assessment_Competitive_Landscape'}]
            : [{uri: '#', title: 'DocID: Q2_2024_Earnings_Transcript'}, {uri: '#', title: 'DocID: DCF_Model_July_2024'}, {uri: '#', title: 'DocID: Risk_Assessment_Competitive_Landscape'}];


        const agents: { role: ChatRole, content: string, citations?: any[] }[] = [
            { role: 'Planner', content: `Initiating comprehensive analysis for ${state.report.ticker}. Plan: 1) Verify real-time price. 2) Query internal knowledge base${fileName ? ` and user-provided document '${fileName}'` : ''} for historical performance. 3) Execute web search for Q3 earnings reports and recent analyst ratings. 4) Delegate findings to Technical, Macro, and Sentiment analysts for specialized review.` },
            { role: 'Price Verification', content: priceVerificationMessage },
            { role: 'Vector Retrieval', content: vectorRetrievalContent, citations: vectorRetrievalCitations },
            { role: 'Web Search', content: `Executing Tavily web search for "recent ${state.report.ticker} news and analyst ratings". Key findings: 1) Reuters reports a 15% YoY revenue growth projection. 2) Morgan Stanley upgraded ${state.report.ticker} to "Overweight" with a price target of $${(numericPrice * 1.15).toFixed(2)}. 3) The Wall Street Journal notes potential supply chain disruptions in the sector.`, citations: [{uri: 'https://www.reuters.com', title: `Reuters: ${state.report.ticker} Revenue Growth Report`}, {uri: 'https://www.morganstanley.com', title: 'Morgan Stanley Analyst Note'}, {uri: 'https://www.wsj.com', title: 'WSJ: Sector Supply Chain Analysis'}] },
            { role: 'Technical', content: `Based on the current price of ${state.report.currentPrice}, technical analysis shows the following: The 50-day moving average is at $${(numericPrice * 0.98).toFixed(2)} and the 200-day moving average is at $${(numericPrice * 0.95).toFixed(2)}, indicating a bullish trend. The Relative Strength Index (RSI) is at 58, suggesting neutral to slightly bullish momentum. Key resistance is identified at $${(numericPrice * 1.05).toFixed(2)}, with support at $${(numericPrice * 0.92).toFixed(2)}. MACD line is crossing above the signal line, a potential buy signal.` },
            { role: 'Macro', content: 'Macroeconomic analysis indicates a mixed environment. The latest CPI report showed inflation at 3.1%, slightly above target, which may delay rate cuts. However, Producer Price Index (PPI) is down 0.5% MoM, suggesting easing wholesale price pressures. The upcoming FOMC meeting will be critical; CME FedWatch Tool predicts a 90% probability of rates remaining unchanged.', citations: [{uri: '#', title: 'Bureau of Labor Statistics: CPI Report'}, {uri: 'https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html', title: 'CME FedWatch Tool'}] },
            { role: 'Sentiment', content: 'Aggregating sentiment data: The CNN Fear & Greed Index is currently at 72 (Greed), up from 65 last week. Analysis of social media mentions shows a 65% positive sentiment score over the last 24 hours. News headline analysis from major financial outlets reveals a neutral-to-positive tone, with a score of +0.3 on a scale of -1 to 1.', citations: [{uri: 'https://www.cnn.com/markets/fear-and-greed', title: 'CNN Business: Fear & Greed Index'}] },
            { role: 'Writer', content: `Initiating synthesis. I will integrate the technical resistance level at $${(numericPrice * 1.05).toFixed(2)}, the macroeconomic catalyst from the upcoming FOMC meeting, and the positive sentiment score of 65%. The core thesis will balance the bullish technicals against the uncertain macro backdrop.` },
            { role: 'Critic', content: "Critique of Writer's plan: The synthesis plan is logical. Ensure the report explicitly states the potential risk from the CPI data and the supply chain issues found by the Web Search agent. The conclusion should provide clear entry/exit points based on the technical levels identified. Proceeding to generate full draft for human review." }
        ];

        if (state.step < agents.length) {
            state.report.analysisDebate.push(agents[state.step]);
            state.step += 1;
        } else {
            state.report.status = 'Human_Review';
            state.report.synthesis = "The final synthesis combines insights from internal knowledge, real-time web data, and multi-faceted analysis. While technical indicators suggest a potential breakout, macro-economic factors introduce significant uncertainty. The recommended strategy is to await confirmation above the key resistance level before entering a position.";
            state.report.executiveSummary = "Cautiously optimistic outlook, awaiting breakout confirmation.";
            state.report.quantStrategy.report = "**Strategy:** RSI Mean Reversion\n**Win Rate:** 62%\n**Sharpe Ratio:** 1.3\n**Max Drawdown:** -15%";
        }
        
        return { report: { ...state.report, analysisDebate: [...state.report.analysisDebate] }};
    },
    async approveReport(threadId: string, feedback: string): Promise<{ status: string }> {
         console.log(`[Frontend->Backend] Approving report ${threadId} with feedback: "${feedback}"`);
         if (window.mockState && window.mockState[threadId]) {
             window.mockState[threadId].report.status = 'Approved';
         }
        return { status: 'approved' };
    },
    async recalculateStrategy(threadId: string, params: QuantStrategy['params']): Promise<{ quantStrategy: QuantStrategy }> {
        console.log(`[Frontend->Backend] Recalculating strategy for ${threadId} with params:`, params);
        if (window.mockState && window.mockState[threadId]) {
            const newReportText = simulateRecalculation(params);
            const newReport: QuantStrategy = {
                params,
                report: newReportText
            };
            
            window.mockState[threadId].report.quantStrategy = newReport;
            return { quantStrategy: newReport };
        }
        throw new Error("Report not found for recalculation");
    },
    async chatWithCoPilot(threadId: string, message: string): Promise<{ report: AnalysisReport }> {
        console.log(`[Frontend->Backend] User chat for ${threadId}: "${message}"`);
        if (!window.mockState || !window.mockState[threadId]) {
            throw new Error("Report not found for chat.");
        }
        
        const state = window.mockState[threadId];
        const report = state.report as AnalysisReport;
        
        // 1. Add user message to debate
        report.analysisDebate.push({ role: 'User', content: message });
        
        // 2. Simulate Co-Pilot response and potential strategy change
        let coPilotResponse = "I'm ready to assist. How can I help you refine this strategy?";
        const lowerMessage = message.toLowerCase();
        const currentParams = { ...report.quantStrategy.params };
        let paramsChanged = false;

        if (lowerMessage.includes('aggressive') || lowerMessage.includes('more risk')) {
            currentParams.take_profit_percent = Math.min(100, currentParams.take_profit_percent + 5);
            currentParams.stop_loss_percent = Math.min(100, currentParams.stop_loss_percent + 3);
            coPilotResponse = `Understood. To make the strategy more aggressive, I've increased the take-profit target to ${currentParams.take_profit_percent}% and widened the stop-loss to ${currentParams.stop_loss_percent}%. This increases potential reward but also risk. The performance metrics have been updated.`;
            paramsChanged = true;
        } else if (lowerMessage.includes('conservative') || lowerMessage.includes('less risk')) {
            currentParams.take_profit_percent = Math.max(1, currentParams.take_profit_percent - 3);
            currentParams.stop_loss_percent = Math.max(1, currentParams.stop_loss_percent - 2);
            coPilotResponse = `Okay, for a more conservative approach, I've reduced the take-profit target to ${currentParams.take_profit_percent}% and tightened the stop-loss to ${currentParams.stop_loss_percent}%. This aims to secure profits sooner and limit downside. The metrics are updated.`;
            paramsChanged = true;
        } else if (lowerMessage.includes('what if') || lowerMessage.includes('question')) {
            coPilotResponse = "That's a great question. Based on the analysis, the primary risk is macro-economic uncertainty. The technicals suggest upside, but external factors could impact the thesis. Diversifying with a small hedge might be prudent.";
        } else if (lowerMessage.includes('rsi')) {
             coPilotResponse = `The RSI parameters are currently set to ${currentParams.rsi_oversold} (oversold) and ${currentParams.rsi_overbought} (overbought). A tighter band (e.g., 40/60) would trade more frequently but might be less reliable. A wider band (e.g., 20/80) trades less but signals stronger reversals. What would you like to test?`;
        }

        if (paramsChanged) {
            report.quantStrategy.params = currentParams;
            report.quantStrategy.report = simulateRecalculation(currentParams);
        }
        
        // 3. Add Co-Pilot response to debate
        report.analysisDebate.push({ role: 'Co-Pilot', content: coPilotResponse });
        
        // 4. Return the updated report
        return { report };
    }
}

/**
 * Starts a new financial analysis workflow on the backend.
 * @param ticker The stock or crypto ticker to analyze.
 * @param query The user's specific query or request.
 * @returns A promise that resolves with the initial response from the backend, including a thread_id.
 */
export const runAnalysis = async (ticker: string, query: string, file: File | null): Promise<AnalysisResponse> => {
    // In a real app, this would be a POST request to `${API_BASE_URL}/api/analyze`
    // const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ ticker, query }),
    // });
    // if (!response.ok) {
    //     throw new Error('Failed to start analysis');
    // }
    // return response.json();
    return mockApi.runAnalysis(ticker, query, file);
};

/**
 * Fetches the current state of an ongoing analysis workflow from the backend.
 * @param threadId The ID of the workflow thread to query.
 * @returns A promise that resolves with the current state of the analysis report.
 */
export const getAnalysisState = async (threadId: string): Promise<StateResponse> => {
    // In a real app, this would be a GET request to `${API_BASE_URL}/api/state/${threadId}`
    // const response = await fetch(`${API_BASE_URL}/api/state/${threadId}`);
    // if (!response.ok) {
    //     throw new Error('Failed to fetch analysis state');
    // }
    // return response.json();
    return mockApi.getAnalysisState(threadId);
};

/**
 * Sends an approval signal to the backend for a report awaiting human review.
 * @param threadId The ID of the workflow thread to approve.
 * @param feedback User-provided feedback (e.g., "Approved").
 * @returns A promise that resolves with the backend's confirmation status.
 */
export const approveReport = async (threadId: string, feedback: string): Promise<{ status: string }> => {
    // In a real app, this would be a POST request to `${API_BASE_URL}/api/approve`
    // const response = await fetch(`${API_BASE_URL}/api/approve`, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ thread_id: threadId, feedback }),
    // });
    // if (!response.ok) {
    //     throw new Error('Failed to approve report');
    // }
    // return response.json();
    return mockApi.approveReport(threadId, feedback);
};

/**
 * Sends new quantitative strategy parameters to the backend for recalculation.
 * @param threadId The ID of the workflow thread.
 * @param params The new strategy parameters.
 * @returns A promise that resolves with the updated quantitative strategy report.
 */
export const recalculateStrategy = async (threadId: string, params: QuantStrategy['params']): Promise<{ quantStrategy: QuantStrategy }> => {
    // In a real app, this would be a POST request to `${API_BASE_URL}/api/recalculate`
    return mockApi.recalculateStrategy(threadId, params);
}
