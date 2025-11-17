import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AnalysisReport, DataHealth, ChatMessage, ChatRole, QuantStrategy } from '../types';

// Icons defined as separate components
const ChartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
);
const GlobeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h10a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.881 15.121A9 9 0 1021 11h-1.055" /></svg>
);
const NewsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3h2m-4 3h2m-4 3h2" /></svg>
);
const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
);
const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" /></svg>
);
const SynthesizerIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
);
const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
);
const LightbulbIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
);
const LinkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
);
const ShieldCheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const CogIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);
// New agent icons
const PlannerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
const PriceCheckIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>);
const VectorDBIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4M4 7l8 4.5 8-4.5M12 11.5V21" /></svg>;
const WebSearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const WriterIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
const CoPilotIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);


interface AnalysisInterfaceProps {
    reports: AnalysisReport[];
    onRunAnalysis: (ticker: string, query: string, file?: File) => void;
    onDownloadPack: (report: AnalysisReport) => void;
    onApproveReport: (reportId: string) => void;
    onRecalculateStrategy: (reportId: string, params: QuantStrategy['params']) => Promise<void>;
    onChatWithCoPilot: (reportId: string, message: string) => Promise<void>;
    isLoading: boolean;
}

interface ReportCardProps {
    report: AnalysisReport;
    onDownloadPack: (report: AnalysisReport) => void;
    onApproveReport: (reportId: string) => void;
    onRecalculateStrategy: (reportId: string, params: QuantStrategy['params']) => Promise<void>;
    onChatWithCoPilot: (reportId: string, message: string) => Promise<void>;
}

const getAgentDetails = (role: ChatRole) => {
    switch (role) {
        case 'Planner': return { icon: <PlannerIcon />, color: 'text-cyan-300', name: 'Planner Agent' };
        case 'Price Verification': return { icon: <PriceCheckIcon />, color: 'text-teal-300', name: 'Price Verification Agent' };
        case 'Vector Retrieval': return { icon: <VectorDBIcon />, color: 'text-orange-300', name: 'Vector Retrieval Agent' };
        case 'Web Search': return { icon: <WebSearchIcon />, color: 'text-lime-300', name: 'Web Search Agent (Tavily)' };
        case 'Technical': return { icon: <ChartIcon />, color: 'text-blue-300', name: 'Technical Analyst' };
        case 'Macro': return { icon: <GlobeIcon />, color: 'text-green-300', name: 'Macro Analyst' };
        case 'Sentiment': return { icon: <NewsIcon />, color: 'text-yellow-300', name: 'Sentiment Analyst' };
        case 'Writer': return { icon: <WriterIcon />, color: 'text-fuchsia-300', name: 'Writer Agent' };
        case 'Critic': return { icon: <ShieldCheckIcon />, color: 'text-red-300', name: 'Critic Agent' };
        case 'Co-Pilot': return { icon: <CoPilotIcon />, color: 'text-purple-300', name: 'Strategy Co-Pilot' };
        case 'User': return { icon: <UserIcon />, color: 'text-indigo-300', name: 'You' };
        default: return { icon: <div/>, color: 'text-gray-300', name: 'System' };
    }
};

const DataHealthCheck: React.FC<{ dataHealth: DataHealth }> = ({ dataHealth }) => {
    const isSuccess = dataHealth.status === 'Verified';
    const bgColor = isSuccess ? 'bg-green-900/50 border-green-700' : 'bg-yellow-900/50 border-yellow-700';
    const textColor = isSuccess ? 'text-green-300' : 'text-yellow-300';
    const listStyle = "flex justify-between py-1 border-b border-gray-700/50";
    const labelStyle = "text-sm text-gray-400";
    const valueStyle = "text-sm font-mono text-gray-200";

    return (
        <div className={`border rounded-lg p-4 mb-6 ${bgColor}`}>
            <h3 className={`font-bold text-lg mb-2 ${textColor}`}>
                Data Health Check: <span className="font-normal">{isSuccess ? 'Data Verified' : 'Stale Data Warning'}</span>
            </h3>
            <ul className="space-y-1">
                <li className={listStyle}><span className={labelStyle}>Asset Class</span><span className={valueStyle}>{dataHealth.assetClass}</span></li>
                <li className={listStyle}><span className={labelStyle}>Data Source</span><span className={valueStyle}>{dataHealth.dataSource}</span></li>
                <li className={listStyle}><span className={labelStyle}>Analysis Price</span><span className={valueStyle}>{dataHealth.price}</span></li>
                <li className={listStyle}><span className={labelStyle}>Timestamp</span><span className={valueStyle}>{dataHealth.timestamp}</span></li>
                <li className={listStyle.replace(' border-b', '')}><span className={labelStyle}>Latency</span><span className={valueStyle}>{dataHealth.latency}</span></li>
            </ul>
             { !isSuccess && <p className="text-xs text-yellow-400 mt-3">Warning: AI analysis is based on non-real-time data and is for reference only.</p> }
        </div>
    );
};

const AgentDebateLog: React.FC<{ chat: ChatMessage[] }> = ({ chat }) => {
    const chatEndRef = useRef<null | HTMLDivElement>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chat]);

    return (
        <div className="bg-gray-700/50 rounded-lg flex flex-col h-[500px] mb-6">
            <h3 className="flex-shrink-0 font-bold text-lg text-white p-4 border-b border-gray-600">Multi-Agent Workflow Log</h3>
            <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {chat.map((message, index) => {
                    const { icon, color, name } = getAgentDetails(message.role);
                    const isUser = message.role === 'User';
                    const alignment = isUser ? 'flex-row-reverse' : 'flex-row';
                    const textAlignment = isUser ? 'text-right' : 'text-left';
                    const bubbleColor = isUser ? 'bg-indigo-900/50' : 'bg-gray-800/50';

                    return (
                        <div key={index} className={`flex items-start space-x-3 space-x-reverse ${alignment}`}>
                             <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center ${color}`}>
                                {icon}
                            </div>
                            <div className={`flex-grow p-3 rounded-lg ${bubbleColor}`}>
                                <p className={`font-bold ${color} ${textAlignment}`}>{name}</p>
                                <p className={`text-gray-300 ${textAlignment}`}>{message.content}</p>
                                {message.citations && message.citations.length > 0 && (
                                    <div className={`mt-3 pt-3 border-t border-gray-700/50 ${textAlignment}`}>
                                        <h4 className={`text-xs font-semibold text-gray-400 mb-1 flex items-center ${isUser ? 'justify-end' : 'justify-start'}`}>
                                            <LinkIcon />
                                            <span className="ml-1.5">Sources</span>
                                        </h4>
                                        <ul className="space-y-1">
                                            {message.citations.map((citation, i) => (
                                                <li key={i}>
                                                    <a 
                                                        href={citation.uri} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline truncate block"
                                                        title={citation.title}
                                                    >
                                                        {citation.title}
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={chatEndRef} />
            </div>
        </div>
    );
};

const InteractiveStrategy: React.FC<{
    params: QuantStrategy['params'];
    onParamsChange: (newParams: QuantStrategy['params']) => void;
    onRecalculate: () => void;
    isActionable: boolean;
}> = ({ params, onParamsChange, onRecalculate, isActionable }) => {
    
    const handleSliderChange = (param: keyof QuantStrategy['params'], value: number) => {
        const newParams = { ...params, [param]: value };

        // Ensure oversold is not greater than overbought
        if (param === 'rsi_oversold' && value > newParams.rsi_overbought) {
            newParams.rsi_overbought = value;
        }
        if (param === 'rsi_overbought' && value < newParams.rsi_oversold) {
            newParams.rsi_oversold = value;
        }

        onParamsChange(newParams);
    };

    return (
        <div className="bg-gray-700/50 p-5 rounded-lg">
            <h3 className="flex items-center font-bold text-lg text-amber-300 mb-4">
               <CogIcon /> <span className="ml-2">Interactive Strategy Customization</span>
            </h3>
            <div className="space-y-4">
                {Object.entries(params).map(([key, value]) => (
                    <div key={key}>
                        <label className="flex justify-between items-center text-sm font-medium text-gray-300 mb-1">
                            <span>{key.replace(/_/g, ' ')}</span>
                            <span className="font-mono text-amber-200">{value}{key.includes('percent') ? '%' : ''}</span>
                        </label>
                        <input
                            type="range"
                            min={key.includes('percent') ? 1 : 0}
                            max={100}
                            step={key.includes('percent') ? 0.5 : 1}
                            value={value}
                            onChange={(e) => handleSliderChange(key as keyof QuantStrategy['params'], parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            disabled={!isActionable}
                        />
                    </div>
                ))}
            </div>
            <button
                onClick={onRecalculate}
                disabled={!isActionable}
                className="w-full mt-6 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-800/50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition duration-200"
            >
                Recalculate Strategy
            </button>
        </div>
    );
};

const CoPilotChat: React.FC<{
    chatHistory: ChatMessage[];
    onSendMessage: (message: string) => void;
}> = ({ chatHistory, onSendMessage }) => {
    const [input, setInput] = useState('');
    const chatEndRef = useRef<null | HTMLDivElement>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatHistory]);

    const handleSend = () => {
        if (input.trim()) {
            onSendMessage(input.trim());
            setInput('');
        }
    };

    return (
        <div className="bg-gray-700/50 p-5 rounded-lg flex flex-col h-[400px]">
            <h3 className="flex items-center font-bold text-lg text-purple-300 mb-4 flex-shrink-0">
               <CoPilotIcon /> <span className="ml-2">Strategy Co-Pilot Q&A</span>
            </h3>
            <div className="flex-grow overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {chatHistory.map((message, index) => {
                     const { icon, color, name } = getAgentDetails(message.role);
                     const isUser = message.role === 'User';
                     const alignment = isUser ? 'flex-row-reverse' : 'flex-row';
                     const textAlignment = isUser ? 'text-right' : 'text-left';
                     const bubbleColor = isUser ? 'bg-indigo-900/50' : 'bg-gray-800/50';
                     return (
                         <div key={index} className={`flex items-start space-x-3 space-x-reverse ${alignment}`}>
                              <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center ${color}`}>
                                 {icon}
                             </div>
                             <div className={`flex-grow p-3 rounded-lg ${bubbleColor}`}>
                                 <p className={`font-bold ${color} ${textAlignment}`}>{name}</p>
                                 <p className={`text-gray-300 ${textAlignment}`}>{message.content}</p>
                             </div>
                         </div>
                     );
                })}
                 <div ref={chatEndRef} />
            </div>
            <div className="mt-4 flex-shrink-0 flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask a question or suggest a change..."
                    className="w-full bg-gray-900 text-white placeholder-gray-500 border border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                    onClick={handleSend}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition duration-200"
                >
                    Send
                </button>
            </div>
        </div>
    );
};

const ReportCard: React.FC<ReportCardProps> = React.memo(({ report, onDownloadPack, onApproveReport, onRecalculateStrategy, onChatWithCoPilot }) => {
    const [localQuantStrategy, setLocalQuantStrategy] = useState<QuantStrategy>(report.quantStrategy);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        setLocalQuantStrategy(report.quantStrategy);
    }, [report.quantStrategy]);

    const handleRecalculate = async () => {
        setIsUpdating(true);
        await onRecalculateStrategy(report.id, localQuantStrategy.params);
        setIsUpdating(false);
    };

    const handleCoPilotSendMessage = async (message: string) => {
        await onChatWithCoPilot(report.id, message);
    };

    const coPilotChatHistory = report.analysisDebate.filter(
        msg => msg.role === 'User' || msg.role === 'Co-Pilot'
    );

    const formattedQuantReport = localQuantStrategy.report
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
        .replace(/\n/g, '<br />');
    
    const isActionable = report.status === 'Human_Review';
    const isApproved = report.status === 'Approved';

    const getStatusBadge = () => {
        switch(report.status) {
            case 'Running':
                return <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200 animate-pulse">Running...</span>;
            case 'Human_Review':
                return <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-yellow-600 bg-yellow-200">Pending Approval</span>;
            case 'Approved':
                 return <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-200">Approved</span>;
            default:
                return <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-gray-600 bg-gray-200">Draft</span>;
        }
    }


    return (
        <div className="bg-gray-800/80 backdrop-blur-md rounded-lg shadow-lg p-6 border border-gray-700 mb-8">
             <style>{`
                .flash-update {
                    animation: flash 1s ease-out;
                }
                @keyframes flash {
                    0% { background-color: rgba(139, 92, 246, 0.2); }
                    100% { background-color: transparent; }
                }
            `}</style>
            <header className="flex flex-col sm:flex-row justify-between items-start mb-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-3xl font-bold text-white">{report.ticker} - AI Analysis Report</h2>
                        {getStatusBadge()}
                    </div>
                     <p className="text-sm text-gray-400">Query: <span className="text-gray-300">{report.query}</span></p>
                    <p className="text-sm text-gray-400">Executive Summary: <span className="text-gray-300">{report.executiveSummary || 'Awaiting final synthesis...'}</span></p>
                </div>
                <div className="flex items-center gap-2 mt-3 sm:mt-0">
                    {isActionable && (
                        <button
                            onClick={() => onApproveReport(report.id)}
                            className="flex items-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-200"
                        >
                            <ShieldCheckIcon /> <span className="ml-2">Approve Report</span>
                        </button>
                    )}
                    <button
                        onClick={() => onDownloadPack(report)}
                        disabled={!isApproved}
                        className="flex items-center bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800/50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition duration-200"
                        title={!isApproved ? "Approve the report to enable download" : "Download analysis pack"}
                    >
                        <DownloadIcon />
                        Download Pack
                    </button>
                </div>
            </header>

            <DataHealthCheck dataHealth={report.dataHealth} />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3">
                    <AgentDebateLog chat={report.analysisDebate} />
                </div>
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-gray-700/50 p-5 rounded-lg">
                        <h3 className="flex items-center font-bold text-lg text-teal-300 mb-3">
                           <SynthesizerIcon /> <span className="ml-2">Final Synthesis</span>
                        </h3>
                        <p className="text-gray-300 text-sm">{report.synthesis || 'Awaiting final write-up from Writer and Critic agents...'}</p>
                    </div>

                    <div className={`bg-gray-700/50 p-5 rounded-lg ${isUpdating ? 'flash-update' : ''}`}>
                        <h3 className="flex items-center font-bold text-lg text-purple-300 mb-4">
                           <WriterIcon /> <span className="ml-2">Quantitative Strategy Report</span>
                        </h3>
                        
                        <div className="prose prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: formattedQuantReport }} />
                    </div>

                    {isActionable && (
                        <>
                            <InteractiveStrategy 
                                params={localQuantStrategy.params}
                                onParamsChange={(newParams) => setLocalQuantStrategy(prev => ({ ...prev, params: newParams }))}
                                onRecalculate={handleRecalculate}
                                isActionable={isActionable}
                            />
                            <CoPilotChat 
                                chatHistory={coPilotChatHistory}
                                onSendMessage={handleCoPilotSendMessage}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
});

const SearchForm: React.FC<{ onRunAnalysis: (ticker: string, query: string, file?: File) => void; isLoading: boolean }> = ({ onRunAnalysis, isLoading }) => {
    const [ticker, setTicker] = useState('BTC/USD');
    const [query, setQuery] = useState('Provide a comprehensive analysis covering technical, macro, and sentiment aspects.');
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleRemoveFile = () => {
        setFile(null);
        if(fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onRunAnalysis(ticker, query, file ?? undefined);
    };

    return (
        <form onSubmit={handleSubmit} className="mb-8 p-6 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="flex flex-col md:flex-row items-start gap-4">
                 <LightbulbIcon />
                 <div className="flex-grow w-full space-y-4">
                    <div>
                        <label htmlFor="file-upload" className="text-sm font-medium text-gray-300 mb-1 block">
                            RAG Document (Optional - for context)
                        </label>
                        {!file ? (
                            <label className="relative cursor-pointer w-full bg-gray-900 text-gray-400 border border-gray-600 rounded-md py-2 px-3 focus:outline-none focus-within:ring-2 focus-within:ring-indigo-500 flex items-center justify-center hover:bg-gray-800 transition-colors">
                                <UploadIcon />
                                <span className="ml-2">Click to upload a financial report...</span>
                                <input id="file-upload" type="file" className="sr-only" onChange={handleFileChange} ref={fileInputRef} accept=".pdf,.txt,.md,.csv" disabled={isLoading}/>
                            </label>
                        ) : (
                            <div className="flex items-center justify-between w-full bg-gray-900 text-white border border-gray-600 rounded-md py-2 px-3">
                                <span className="truncate text-sm" title={file.name}>{file.name}</span>
                                <button
                                    type="button"
                                    onClick={handleRemoveFile}
                                    className="ml-4 text-red-500 hover:text-red-400 font-bold text-lg leading-none"
                                    aria-label="Remove file"
                                    disabled={isLoading}
                                >
                                    &times;
                                </button>
                            </div>
                        )}
                    </div>
                    <div>
                        <label htmlFor="ticker-input" className="text-sm font-medium text-gray-300 mb-1 block">Ticker</label>
                        <input
                            id="ticker-input"
                            type="text"
                            value={ticker}
                            onChange={(e) => setTicker(e.target.value)}
                            placeholder="e.g., AAPL, GOOGL, BTC/USD"
                            className="w-full bg-gray-900 text-white placeholder-gray-500 border border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            disabled={isLoading}
                        />
                    </div>
                     <div>
                        <label htmlFor="query-input" className="text-sm font-medium text-gray-300 mb-1 block">Analysis Query</label>
                        <textarea
                            id="query-input"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="e.g., Comprehensive analysis, focus on short-term volatility..."
                            className="w-full bg-gray-900 text-white placeholder-gray-500 border border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24"
                            disabled={isLoading}
                        />
                    </div>
                 </div>
                <div className="w-full md:w-auto self-end">
                    <button
                        type="submit"
                        disabled={isLoading || !ticker || !query}
                        className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-wait text-white font-bold py-3 px-6 rounded-md transition duration-200"
                    >
                        {isLoading ? 'Analyzing...' : 'Run Analysis'}
                    </button>
                </div>
            </div>
        </form>
    );
};

export const AnalysisInterface: React.FC<AnalysisInterfaceProps> = ({ 
    reports, 
    onRunAnalysis, 
    onDownloadPack, 
    onApproveReport,
    onRecalculateStrategy,
    onChatWithCoPilot,
    isLoading,
}) => {
    return (
        <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
            <SearchForm onRunAnalysis={onRunAnalysis} isLoading={isLoading} />
            
            {isLoading && reports.every(r => r.status === 'Running') && (
                <div className="text-center py-10">
                    <p className="text-lg text-gray-400 animate-pulse">LangGraph workflow initiated... The AI agents are collaborating...</p>
                </div>
            )}
            
            {reports.length > 0 ? (
                <div>
                    {reports.map(report => (
                        <ReportCard 
                            key={report.id}
                            report={report}
                            onDownloadPack={onDownloadPack}
                            onApproveReport={onApproveReport}
                            onRecalculateStrategy={onRecalculateStrategy}
                            onChatWithCoPilot={onChatWithCoPilot}
                        />
                    ))}
                </div>
            ) : !isLoading && (
                 <div className="text-center py-10 border-2 border-dashed border-gray-700 rounded-lg">
                    <h3 className="text-xl font-semibold text-gray-300">Welcome to your AI Co-Pilot</h3>
                    <p className="mt-2 text-sm text-gray-500">Enter a ticker and a query above to begin your first multi-agent analysis.</p>
                </div>
            )}
        </div>
    );
};
