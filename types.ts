export interface QuantStrategy {
  params: {
    rsi_oversold: number;
    rsi_overbought: number;
    stop_loss_percent: number;
    take_profit_percent: number;
  };
  report: string;
}

export interface DataHealth {
  status: 'Verified' | 'Stale';
  assetClass: string;
  dataSource: string;
  price: string;
  timestamp: string;
  latency: string;
}

export type ChatRole = 'Planner' | 'Price Verification' | 'Vector Retrieval' | 'Web Search' | 'Technical' | 'Macro' | 'Sentiment' | 'Writer' | 'Critic' | 'User' | 'Co-Pilot';

export interface Citation {
  uri: string;
  title: string;
}

export interface ChatMessage {
  role: ChatRole;
  content: string;
  citations?: Citation[];
}

export interface AnalysisReport {
  id: string; // This will now be the thread_id from the backend
  ticker: string;
  query: string;
  currentPrice: string;
  dataHealth: DataHealth;
  synthesis: string;
  analysisDebate: ChatMessage[];
  quantStrategy: QuantStrategy;
  executiveSummary: string;
  status: 'Draft' | 'Approved' | 'Running' | 'Human_Review';
}