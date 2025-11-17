import React, { useState, useEffect } from 'react';

interface Ticker {
    name: string;
    value: number | null;
    change: number | null;
    symbol?: string; // Symbol for API calls, e.g., 'SPY', 'QQQ', 'bitcoin'
}

const ALPHA_VANTAGE_API_KEY = 'RW0ZMMPONQCECUM1';

// Using ETFs as proxies for indices for reliable real-time data from free APIs
const initialTickers: Ticker[] = [
    { name: 'S&P 500', value: 547.79, change: 1.22, symbol: 'SPY' },
    { name: 'NASDAQ', value: 476.89, change: -1.55, symbol: 'QQQ' },
    { name: 'DOW J', value: 391.50, change: 0.35, symbol: 'DIA' },
    { name: 'VIX', value: 13.20, change: -0.35 }, // No reliable free API source, remains static
    { name: 'BTC/USD', value: 64150.75, change: 250.11, symbol: 'bitcoin' },
];

const TickerItem: React.FC<{ ticker: Ticker }> = ({ ticker }) => {
    if (ticker.value === null || ticker.change === null) {
        return (
            <div className="flex items-center space-x-2 px-4">
                <span className="text-sm text-gray-400">{ticker.name}</span>
                <span className="text-sm font-semibold text-yellow-400">Data N/A</span>
            </div>
        );
    }
    
    const isPositive = ticker.change >= 0;
    // Note: Percent change calculation is an approximation, real change % would come from API if available
    const changePercent = ticker.value > 0 ? (ticker.change / (ticker.value - ticker.change)) * 100 : 0;

    return (
        <div className="flex items-center space-x-2 px-4">
            <span className="text-sm text-gray-400">{ticker.name}</span>
            <span className="text-sm font-semibold text-white">{ticker.value.toFixed(2)}</span>
            <span className={`text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {isPositive ? '+' : ''}{ticker.change.toFixed(2)} ({changePercent.toFixed(2)}%)
            </span>
        </div>
    );
};

export const MarketHeader: React.FC = () => {
    const [tickers, setTickers] = useState<Ticker[]>(initialTickers);

    useEffect(() => {
        const fetchMarketData = async () => {
            const promises = initialTickers.map(async (ticker) => {
                try {
                    // No symbol (e.g., VIX) - return original static data
                    if (!ticker.symbol) {
                        return ticker;
                    }

                    // Fetch crypto data from CoinGecko
                    if (ticker.name === 'BTC/USD') {
                        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ticker.symbol}&vs_currencies=usd&include_24hr_change=true`);
                        if (!response.ok) throw new Error('CoinGecko API fetch failed');
                        const data = await response.json();
                        const btcData = data[ticker.symbol];

                        if (btcData && typeof btcData.usd === 'number' && typeof btcData.usd_24h_change === 'number') {
                            const price = btcData.usd;
                            const changePercent = btcData.usd_24h_change;
                            const oldPrice = price / (1 + (changePercent / 100));
                            const absoluteChange = price - oldPrice;
                            return { ...ticker, value: price, change: absoluteChange };
                        }
                        throw new Error('Invalid data from CoinGecko');
                    } 
                    
                    // Fetch ETF data from Alpha Vantage for all other symbols
                    const response = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker.symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`);
                    if (!response.ok) {
                        console.warn(`[MarketHeader] Alpha Vantage API fetch failed for ${ticker.symbol} with status ${response.status}`);
                        return { ...ticker, value: null, change: null };
                    }
                    const data = await response.json();
                    
                    // Handle known API limit/error messages gracefully
                    if (data?.Information) {
                        console.warn(`[MarketHeader] Alpha Vantage info for ${ticker.symbol}: ${data.Information}`);
                        return { ...ticker, value: null, change: null };
                    }
                    if (data?.Note) {
                        console.warn(`[MarketHeader] Alpha Vantage note for ${ticker.symbol}: ${data.Note}`);
                        return { ...ticker, value: null, change: null };
                    }
                    if (data?.['Error Message']) {
                        console.warn(`[MarketHeader] Alpha Vantage error for ${ticker.symbol}: ${data['Error Message']}`);
                        return { ...ticker, value: null, change: null };
                    }

                    // Attempt to parse the expected data structure
                    const quote = data?.['Global Quote'];
                    if (quote && quote['05. price'] && quote['09. change']) {
                        const price = parseFloat(quote['05. price']);
                        const change = parseFloat(quote['09. change']);
                        if (!isNaN(price) && !isNaN(change)) {
                            return { ...ticker, value: price, change: change };
                        }
                    }
                    
                    // If we reach here, the data format was unexpected
                    console.warn(`[MarketHeader] Could not parse valid data for ${ticker.symbol}. Response: ${JSON.stringify(data, null, 2)}`);
                    return { ...ticker, value: null, change: null };

                } catch (error) {
                    console.error(`[MarketHeader] Unexpected error fetching data for ${ticker.name}:`, error instanceof Error ? error.message : String(error));
                    return { ...ticker, value: null, change: null };
                }
            });

            const updatedTickers = await Promise.all(promises);
            setTickers(updatedTickers);
        };

        fetchMarketData();
    }, []);

    return (
        <div className="fixed top-0 left-0 right-0 h-10 bg-gray-900/80 backdrop-blur-sm border-b border-gray-700 z-50 overflow-hidden">
            <div className="flex h-full items-center animate-marquee whitespace-nowrap">
                {tickers.map(ticker => <TickerItem key={ticker.name} ticker={ticker} />)}
                {/* Duplicate for seamless marquee effect */}
                {tickers.map(ticker => <TickerItem key={`${ticker.name}-clone`} ticker={ticker} />)}
            </div>
            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0%); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation: marquee 30s linear infinite;
                }
            `}</style>
        </div>
    );
};