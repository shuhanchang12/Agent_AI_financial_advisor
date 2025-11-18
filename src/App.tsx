import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AnalysisReport, ChatMessage, ChatRole, QuantStrategy } from './types';
import * as backendService from './services/geminiService'; // Re-purposed to be the backend service client
import { AnalysisInterface } from './components/ChatInterface';

const App: React.FC = () => {
  const [reports, setReports] = useState<AnalysisReport[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Use a ref to store interval IDs to manage them across renders
  const pollingIntervals = useRef<Record<string, number>>({});

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(pollingIntervals.current).forEach(clearInterval);
    };
  }, []);

  const handleRunAnalysis = useCallback(async (ticker: string, query: string, file: File | null) => {
    if (!ticker || !query || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const { thread_id } = await backendService.runAnalysis(ticker, query, file);
      
      // Add a placeholder report
      const placeholderReport: AnalysisReport = {
        id: thread_id,
        ticker: ticker.toUpperCase(),
        query: query,
        currentPrice: 'Fetching...',
        dataHealth: { status: 'Stale', assetClass: 'Unknown', dataSource: 'Pending...', price: '...', timestamp: '...', latency: '...' },
        synthesis: '',
        analysisDebate: [{ role: 'Planner', content: 'Workflow initiated. Planning research strategy...' }],
        quantStrategy: { params: { rsi_oversold: 30, rsi_overbought: 70, stop_loss_percent: 5, take_profit_percent: 10 }, report: '' },
        executiveSummary: '',
        status: 'Running',
      };
      setReports(prev => [placeholderReport, ...prev]);
      
      // Start polling for this specific thread
      const intervalId = window.setInterval(async () => {
        try {
          const state = await backendService.getAnalysisState(thread_id);
          setReports(prev => prev.map(r => r.id === thread_id ? state.report : r));

          if (state.report.status === 'Human_Review' || state.report.status === 'Approved') {
             if (pollingIntervals.current[thread_id]) {
                clearInterval(pollingIntervals.current[thread_id]);
                delete pollingIntervals.current[thread_id];
             }
             // Check if any other polls are running
             if (Object.keys(pollingIntervals.current).length === 0) {
                setIsLoading(false);
             }
          }
        } catch (pollErr) {
            console.error(`Error polling for thread ${thread_id}:`, pollErr);
            const errorMessage = pollErr instanceof Error ? pollErr.message : "Polling failed.";
            setError(`Failed to get updates for ${ticker}: ${errorMessage}`);
            clearInterval(pollingIntervals.current[thread_id]);
            delete pollingIntervals.current[thread_id];
            if (Object.keys(pollingIntervals.current).length === 0) {
               setIsLoading(false);
            }
        }
      }, 3000); // Poll every 3 seconds

      pollingIntervals.current[thread_id] = intervalId;

    } catch (err) {
      console.error(`Error running full analysis:`, err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during analysis.";
      setError(errorMessage);
      setIsLoading(false);
    }
  }, [isLoading]);

  const handleApproveReport = useCallback(async (reportId: string) => {
      setError(null);
      try {
        await backendService.approveReport(reportId, "Report approved by user.");
        setReports(prev => prev.map(r => 
            r.id === reportId ? { ...r, status: 'Approved' } : r
        ));
      } catch (err) {
        console.error(`Error approving report:`, err);
        const errorMessage = err instanceof Error ? err.message : "Failed to approve report.";
        setError(errorMessage);
      }
  }, []);

  const handleRecalculateStrategy = useCallback(async (reportId: string, params: QuantStrategy['params']) => {
    setError(null);
    try {
        const { quantStrategy } = await backendService.recalculateStrategy(reportId, params);
        setReports(prev => prev.map(r => 
            r.id === reportId ? { ...r, quantStrategy } : r
        ));
    } catch(err) {
        console.error(`Error recalculating strategy:`, err);
        const errorMessage = err instanceof Error ? err.message : "Failed to recalculate strategy.";
        setError(errorMessage);
    }
  }, []);

  const handleChatWithCoPilot = useCallback(async (reportId: string, message: string) => {
    setError(null);
    try {
        const { report } = await backendService.chatWithCoPilot(reportId, message);
        setReports(prev => prev.map(r => r.id === reportId ? report : r));
    } catch(err) {
        console.error(`Error chatting with co-pilot:`, err);
        const errorMessage = err instanceof Error ? err.message : "Failed to communicate with Co-Pilot.";
        setError(errorMessage);
    }
  }, []);

  const handleDownloadPack = useCallback((report: AnalysisReport) => {
    const { ticker, currentPrice, quantStrategy, dataHealth, analysisDebate, synthesis } = report;
    const timestamp = new Date().toLocaleString('sv-SE');

    const downloadFile = (filename: string, content: string, mimeType: string) => {
        const blob = new Blob([content], { type: mimeType });
        const element = document.createElement('a');
        element.href = URL.createObjectURL(blob);
        element.download = filename;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        URL.revokeObjectURL(element.href);
    };
    
    // --- Create CSV Content ---
    const sanitizeForCSV = (text: any) => `"${String(text ?? '').replace(/"/g, '""')}"`;
    const chatRows = analysisDebate.map(m => [`Debate Message (${m.role})`, m.content]);
    
    const csvRows = [
        ['Category', 'Detail'],
        ['Ticker', ticker],
        ['Analysis Price', currentPrice],
        ['Report Timestamp', timestamp],
        ['Data Status', dataHealth.status],
        ['Data Source', dataHealth.dataSource],
        ['Data Timestamp', dataHealth.timestamp],
        ['Final Synthesis', synthesis],
        ...chatRows,
        ...Object.entries(quantStrategy.params).map(([key, value]) => [`Strategy Param: ${key}`, value]),
        ['Quantitative Strategy Report', quantStrategy.report]
    ];
    const csvContent = csvRows.map(row => row.map(sanitizeForCSV).join(',')).join('\n');
    downloadFile(`analysis_dataset_${ticker.replace('/', '_')}.csv`, csvContent, 'text/csv;charset=utf-8;');

    // --- Create HTML Content ---
    const formattedQuantReportHTML = String(quantStrategy.report ?? '')
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
        .replace(/\n/g, '<br />');

    const paramsHTML = Object.entries(quantStrategy.params).map(([key, value]) => `
        <div class="flex justify-between items-center py-1 border-b border-gray-600">
            <span class="text-sm capitalize text-gray-400">${key.replace(/_/g, ' ')}</span>
            <span class="text-sm font-mono text-white">${value}</span>
        </div>
    `).join('');

    const getAgentDetailsHTML = (role: ChatRole) => {
        const icons: Record<string, string> = {
             Planner: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>`,
             'Price Verification': `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>`,
             'Vector Retrieval': `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4M4 7l8 4.5 8-4.5M12 11.5V21" /></svg>`,
             'Web Search': `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>`,
             Technical: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>`,
             Macro: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h10a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.881 15.121A9 9 0 1021 11h-1.055" /></svg>`,
             Sentiment: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3h2m-4 3h2m-4 3h2" /></svg>`,
             Writer: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>`,
             Critic: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
             User: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>`,
        };
        const details: Record<string, {name: string, color: string}> = {
            'Planner': { name: 'Planner Agent', color: 'text-cyan-300' },
            'Price Verification': { name: 'Price Verification Agent', color: 'text-teal-300' },
            'Vector Retrieval': { name: 'Vector Retrieval Agent', color: 'text-orange-300' },
            'Web Search': { name: 'Web Search Agent (Tavily)', color: 'text-lime-300' },
            'Technical': { name: 'Technical Analyst', color: 'text-blue-300' },
            'Macro': { name: 'Macro Analyst', color: 'text-green-300' },
            'Sentiment': { name: 'Sentiment Analyst', color: 'text-yellow-300' },
            'Writer': { name: 'Writer Agent', color: 'text-fuchsia-300' },
            'Critic': { name: 'Critic Agent', color: 'text-red-300' },
            'User': { name: 'You', color: 'text-indigo-300' },
        };
        const agentDetails = details[role] || { name: 'System', color: 'text-gray-300' };
        return { ...agentDetails, icon: icons[role] || '' };
    };
    
    const debateHTML = analysisDebate.map(message => {
        const { icon, color, name } = getAgentDetailsHTML(message.role);
        const isUser = message.role === 'User';
        const alignment = isUser ? 'flex-row-reverse' : 'flex-row';
        const textAlignment = isUser ? 'text-right' : 'text-left';
        const bubbleColor = isUser ? 'bg-indigo-900/50' : 'bg-gray-800/50';

        return `
            <div class="flex items-start space-x-3 space-x-reverse ${alignment} my-4">
                <div class="flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center ${color}">
                    ${icon}
                </div>
                <div class="flex-grow p-3 rounded-lg ${bubbleColor}">
                    <p class="font-bold ${color} ${textAlignment}">${name}</p>
                    <p class="text-gray-300 ${textAlignment}">${message.content}</p>
                </div>
            </div>
        `;
    }).join('');
    
    const dataHealthColor = dataHealth.status === 'Verified' ? 'green' : 'yellow';

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-E">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Trading Analysis: ${ticker}</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-900 text-white p-4 md:p-8 font-sans">
        <div class="max-w-5xl mx-auto bg-gray-800/80 backdrop-blur-md rounded-lg shadow-lg p-6 md:p-8 border border-gray-700">
            <div class="flex justify-between items-start mb-6">
                <div>
                    <h1 class="text-3xl font-bold text-white">${ticker} - AI Analysis Report</h1>
                    <p class="text-sm text-gray-400">Generated on ${timestamp}</p>
                </div>
            </div>

            <div class="border border-${dataHealthColor}-700 bg-${dataHealthColor}-900/50 rounded-lg p-4 mb-6">
                <h3 class="font-bold text-lg mb-2 text-${dataHealthColor}-300">Data Health Check: <span class="font-normal">${dataHealth.status === 'Verified' ? 'Data Verified' : 'Stale Data Warning'}</span></h3>
                <ul class="text-sm">
                    <li class="flex justify-between py-1 border-b border-gray-700/50"><span class="text-gray-400">Asset Class</span><span class="font-mono text-gray-200">${dataHealth.assetClass}</span></li>
                    <li class="flex justify-between py-1 border-b border-gray-700/50"><span class="text-gray-400">Data Source</span><span class="font-mono text-gray-200">${dataHealth.dataSource}</span></li>
                    <li class="flex justify-between py-1 border-b border-gray-700/50"><span class="text-gray-400">Analysis Price</span><span class="font-mono text-gray-200">${dataHealth.price}</span></li>
                    <li class="flex justify-between py-1"><span class="text-gray-400">Timestamp</span><span class="font-mono text-gray-200">${dataHealth.timestamp}</span></li>
                </ul>
            </div>
            
            <div class="bg-gray-700/50 p-4 rounded-lg mb-6">
                <h3 class="font-bold text-lg text-teal-300 mb-2">Final Synthesis</h3>
                <p class="text-gray-300 text-sm">${synthesis}</p>
            </div>

            <div class="bg-gray-700/50 p-4 rounded-lg mb-6">
                <h3 class="font-bold text-lg text-white mb-4">Multi-Agent Analysis Debate</h3>
                <div>${debateHTML}</div>
            </div>

            <div>
                <h3 class="font-bold text-xl text-purple-300 mb-3">Quantitative Strategy</h3>
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="lg:col-span-2 bg-gray-700/50 p-5 rounded-lg prose prose-invert max-w-none text-sm">${formattedQuantReportHTML}</div>
                    <div class="bg-gray-700/50 p-5 rounded-lg">
                        <h4 class="font-bold text-lg mb-4 text-white">Final Parameters</h4>
                        <div class="space-y-2">${paramsHTML}</div>
                    </div>
                </div>
            </div>

            <p class="text-xs text-gray-500 text-center mt-8">This is a static report generated by the AI Trading Co-Pilot. Interactive features are disabled.</p>
        </div>
    </body>
    </html>
    `;
    downloadFile(`interactive_strategy_${ticker.replace('/', '_')}.html`, htmlContent, 'text/html;charset=utf-8;');
  }, []);

  const handleClearError = () => setError(null);

  return (
    <div className="flex flex-col h-screen text-white font-sans">
      <header className="flex-shrink-0 text-center p-4">
        <h1 className="text-4xl font-bold">AI Trading Co-Pilot</h1>
        <p className="text-md text-gray-400">Production-Grade Multi-Agent System with LangGraph, RAG, and Human-in-the-Loop</p>
      </header>

      <main className="flex-grow flex flex-col mx-auto w-full max-w-7xl p-4 overflow-hidden">
         {error && (
            <div className="bg-red-800/50 border border-red-600 text-red-200 px-4 py-3 rounded-lg relative mb-4" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
                <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={handleClearError}>
                    <svg className="fill-current h-6 w-6 text-red-400 hover:text-red-200" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
                </span>
            </div>
        )}
        <AnalysisInterface 
          reports={reports}
          onRunAnalysis={handleRunAnalysis}
          onDownloadPack={handleDownloadPack}
          onApproveReport={handleApproveReport}
          onRecalculateStrategy={handleRecalculateStrategy}
          onChatWithCoPilot={handleChatWithCoPilot}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
};

export default App;
