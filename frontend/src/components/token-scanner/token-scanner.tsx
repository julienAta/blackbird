"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Power, Trash2, Brain } from "lucide-react";
import { DataTable } from "./data-table";
import { TokenDetailsModal } from "./token-details-modal";
import { columns } from "./columns";
import { TokenData, TokenCreationEvent, TradeEvent } from "./types";
import { useQuery } from "@tanstack/react-query";
import { fetchSolPrice } from "@/app/actions/token";
import { TokenMetrics } from "./types";
import Papa from "papaparse";
import { toast } from "@/hooks/use-toast";

const BUFFER_INTERVAL = 500;
const MAX_TOKENS = 10000;
const MAX_TRADES_PER_TOKEN = 500000000;
const MIN_HOLDERS_TO_KEEP = 30;
const REMOVE_AFTER_MINUTES = 5;
const MIN_MARKET_CAP_TO_KEEP = 70;
const MIN_TRADES_FOR_PREDICTION = 3;
const PREDICTION_WINDOW_MINUTES = 10;

async function predictToken(trades: TradeEvent[], token: TokenData) {
  try {
    const response = await fetch("http://localhost:8000/api/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        trades,
        token: {
          mint: token.mint,
          initialBuySol: token.initialBuySol,
          initialBuyPercent: token.initialBuyPercent,
          liquidity: token.liquidity,
          marketCap: token.marketCap,
        },
      }),
    });

    if (!response.ok) {
      throw new Error("Prediction failed");
    }

    const prediction = await response.json();
    return prediction;
  } catch (error) {
    console.error("Prediction error:", error);
    return null;
  }
}

export function TokenScanner() {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [selectedToken, setSelectedToken] = useState<TokenData | undefined>(
    undefined
  );
  const [defaultSolPrice, setDefaultSolPrice] = useState<number>(160);
  const [trades, setTrades] = useState<Map<string, TradeEvent[]>>(new Map());
  const [wsStatus, setWsStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("disconnected");
  const [predictions, setPredictions] = useState<
    Map<string, { isPromising: boolean; probability: number }>
  >(new Map());

  const wsRef = useRef<WebSocket | undefined>(undefined);
  const subscribedTokensRef = useRef<Set<string>>(new Set());
  const tokenMetricsRef = useRef<Map<string, TokenMetrics>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isConnectingRef = useRef<boolean>(false);
  const pendingTokenUpdatesRef = useRef<Map<string, Partial<TokenData>>>(
    new Map()
  );
  const updateTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const pendingPredictionsRef = useRef<
    Map<string, { token: TokenData; trades: TradeEvent[] }>
  >(new Map());
  const predictionTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const { data: solPrice = defaultSolPrice } = useQuery({
    queryKey: ["solPrice"],
    queryFn: fetchSolPrice,
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (solPrice) {
      setDefaultSolPrice(solPrice);
    }
  }, [solPrice]);

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = undefined;
    }
    if (predictionTimeoutRef.current) {
      clearTimeout(predictionTimeoutRef.current);
      predictionTimeoutRef.current = undefined;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = undefined;
    }
  }, []);

  const checkTokenPotential = useCallback(
    async (token: TokenData, tokenTrades: TradeEvent[]) => {
      if (tokenTrades.length < MIN_TRADES_FOR_PREDICTION) {
        console.log(
          `Skipping prediction for ${token.name} - not enough trades (${tokenTrades.length})`
        );
        return;
      }

      bufferPrediction(token, tokenTrades);
    },
    []
  );
  const flushPredictions = useCallback(async () => {
    if (pendingPredictionsRef.current.size === 0) return;

    const predictions = pendingPredictionsRef.current;
    pendingPredictionsRef.current = new Map();

    for (const [mint, { token, trades }] of predictions) {
      try {
        const requestData = {
          trades: trades.map((trade) => ({
            mint: trade.mint,
            traderPublicKey: trade.traderPublicKey,
            txType: trade.txType,
            tokenAmount: trade.tokenAmount,
            vSolInBondingCurve: trade.vSolInBondingCurve,
            vTokensInBondingCurve: trade.vTokensInBondingCurve,
            timestamp: trade.timestamp,
            marketCapSol: trade.marketCapSol,
          })),
          token: {
            mint: token.mint,
            initialBuySol: token.initialBuySol,
            initialBuyPercent: token.initialBuyPercent,
            liquidity: token.liquidity,
            marketCap: token.marketCap,
          },
        };

        const response = await fetch("http://localhost:8000/api/predict", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Prediction failed: ${JSON.stringify(errorData)}`);
        }

        const prediction = await response.json();
        setPredictions((prev) => {
          const newPredictions = new Map(prev);
          newPredictions.set(mint, prediction);
          return newPredictions;
        });

        if (prediction.probability > 0.8) {
          console.log("🚀 High potential token detected:", token.name);
          toast({
            title: "High Potential Token! 🚀",
            description: `${token.name} (${(
              prediction.probability * 100
            ).toFixed(1)}%)`,
          });
        }
      } catch (error) {
        console.error(`Prediction error for ${token.name}:`, error);
      }
    }
  }, []);

  // Add this function with other utility functions
  const bufferPrediction = useCallback(
    (token: TokenData, trades: TradeEvent[]) => {
      pendingPredictionsRef.current.set(token.mint, { token, trades });

      if (!predictionTimeoutRef.current) {
        predictionTimeoutRef.current = setTimeout(() => {
          flushPredictions();
          predictionTimeoutRef.current = undefined;
        }, BUFFER_INTERVAL);
      }
    },
    [flushPredictions]
  );
  const initializeTokenMetrics = useCallback(
    (mint: string, initialHolder: string) => {
      tokenMetricsRef.current.set(mint, {
        holders: new Set([initialHolder]),
        totalVolume: 0,
        volumeByTime: {},
        createdAt: Date.now(),
        trades: 0,
        buyCount: 0,
        sellCount: 0,
        uniqueTraders: new Set([initialHolder]),
        lastPrice: 0,
        highPrice: 0,
        lowPrice: Infinity,
        marketCapSol: 0,
      });
    },
    []
  );

  const handleTokenSelect = useCallback((token: TokenData) => {
    setSelectedToken(token);
  }, []);

  const getTradeTotalSol = useCallback((trade: TradeEvent) => {
    return (
      (trade.tokenAmount || 0) *
      (trade.vSolInBondingCurve / trade.vTokensInBondingCurve)
    );
  }, []);

  const flushUpdates = useCallback(() => {
    if (pendingTokenUpdatesRef.current.size === 0) return;

    setTokens((prev) => {
      const now = Date.now();
      const updatedTokens = [...prev];

      return updatedTokens
        .map((token) => {
          const updates = pendingTokenUpdatesRef.current.get(token.mint);
          if (updates) {
            return { ...token, ...updates };
          }
          return token;
        })
        .filter((token) => {
          const metrics = tokenMetricsRef.current.get(token.mint);
          if (!metrics) return false;

          const timeSinceCreated = (now - metrics.createdAt) / 1000 / 60;
          return (
            timeSinceCreated < REMOVE_AFTER_MINUTES ||
            metrics.holders.size >= MIN_HOLDERS_TO_KEEP ||
            token.marketCap >= MIN_MARKET_CAP_TO_KEEP
          );
        });
    });

    pendingTokenUpdatesRef.current.clear();
  }, []);

  const bufferUpdates = useCallback(() => {
    if (!updateTimeoutRef.current) {
      updateTimeoutRef.current = setTimeout(() => {
        flushUpdates();
        updateTimeoutRef.current = undefined;
      }, BUFFER_INTERVAL);
    }
  }, [flushUpdates]);

  const handleNewToken = useCallback(
    (tokenEvent: TokenCreationEvent) => {
      const initialBuySol =
        tokenEvent.initialBuy *
        (tokenEvent.vSolInBondingCurve / tokenEvent.vTokensInBondingCurve);
      const initialBuyPercent =
        (tokenEvent.initialBuy / tokenEvent.vTokensInBondingCurve) * 100;

      const newToken: TokenData = {
        mint: tokenEvent.mint,
        name: tokenEvent.name,
        symbol: tokenEvent.symbol,
        price: tokenEvent.vSolInBondingCurve / tokenEvent.vTokensInBondingCurve,
        timestamp: Date.now(),
        creator: tokenEvent.traderPublicKey,
        marketCap: tokenEvent.marketCapSol,
        initialBuy: tokenEvent.initialBuy,
        initialBuySol,
        initialBuyPercent,
        totalSupply: tokenEvent.vTokensInBondingCurve,
        volume24h: 0,
        holders: 1,
        liquidity: tokenEvent.vSolInBondingCurve,
        onSelect: handleTokenSelect,
      };

      setTokens((prev) => [newToken, ...prev].slice(0, MAX_TOKENS));
      initializeTokenMetrics(tokenEvent.mint, tokenEvent.traderPublicKey);

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            method: "subscribeTokenTrade",
            keys: [tokenEvent.mint],
          })
        );
        subscribedTokensRef.current.add(tokenEvent.mint);
        setTrades((prev) => new Map(prev).set(tokenEvent.mint, []));
      }
    },
    [handleTokenSelect, initializeTokenMetrics]
  );

  const updateTokenMetrics = useCallback(
    (trade: TradeEvent) => {
      // First, update trades state independently
      setTrades((currentTrades) => {
        const existingTrades = currentTrades.get(trade.mint) || [];
        const updatedTrades = [trade, ...existingTrades].slice(0, 50);
        const newTrades = new Map(currentTrades);
        newTrades.set(trade.mint, updatedTrades);

        // Check potential after updating trades
        setTokens((currentTokens) => {
          const token = currentTokens.find((t) => t.mint === trade.mint);
          if (token) {
            const metrics = tokenMetricsRef.current.get(trade.mint);
            if (metrics) {
              const timeSinceCreation = Date.now() - metrics.createdAt;
              const isEarlyPhase =
                timeSinceCreation < PREDICTION_WINDOW_MINUTES * 60 * 1000;

              if (
                isEarlyPhase &&
                updatedTrades.length >= MIN_TRADES_FOR_PREDICTION
              ) {
                console.log(
                  `Checking potential for ${token.name} with ${updatedTrades.length} trades`
                );
                checkTokenPotential(token, updatedTrades);
              }
            }
          }
          return currentTokens;
        });

        return newTrades;
      });

      let metrics = tokenMetricsRef.current.get(trade.mint);
      if (!metrics) {
        initializeTokenMetrics(trade.mint, trade.traderPublicKey);
        metrics = tokenMetricsRef.current.get(trade.mint)!;
      }

      const totalTradeSol = getTradeTotalSol(trade);
      metrics.totalVolume += totalTradeSol;
      metrics.volumeByTime[trade.timestamp] = metrics.totalVolume;
      metrics.trades++;

      if (trade.txType === "buy") {
        metrics.buyCount++;
      } else {
        metrics.sellCount++;
      }

      metrics.holders.add(trade.traderPublicKey);
      metrics.uniqueTraders.add(trade.traderPublicKey);
      metrics.lastPrice =
        trade.vSolInBondingCurve / trade.vTokensInBondingCurve;
      metrics.highPrice = Math.max(metrics.highPrice, metrics.lastPrice);
      metrics.lowPrice = Math.min(metrics.lowPrice, metrics.lastPrice);
      metrics.marketCapSol = trade.marketCapSol;

      pendingTokenUpdatesRef.current.set(trade.mint, {
        price: metrics.lastPrice,
        priceUsd: metrics.lastPrice * solPrice,
        volume24h: metrics.totalVolume,
        volume24hUsd: metrics.totalVolume * solPrice,
        marketCap: trade.marketCapSol,
        holders: metrics.holders.size,
      });

      bufferUpdates();
    },
    [
      solPrice,
      getTradeTotalSol,
      initializeTokenMetrics,
      bufferUpdates,
      checkTokenPotential,
    ]
  );
  const connect = useCallback(() => {
    if (wsRef.current || isConnectingRef.current) {
      console.log("Connection already exists or is in progress");
      return;
    }

    isConnectingRef.current = true;
    setWsStatus("connecting");

    cleanup();

    try {
      wsRef.current = new WebSocket("wss://pumpportal.fun/api/data");

      wsRef.current.onopen = () => {
        console.log("Connected to WebSocket");
        isConnectingRef.current = false;
        setWsStatus("connected");

        wsRef.current?.send(JSON.stringify({ method: "subscribeNewToken" }));

        tokens.forEach((token) => {
          if (!subscribedTokensRef.current.has(token.mint)) {
            wsRef.current?.send(
              JSON.stringify({
                method: "subscribeTokenTrade",
                keys: [token.mint],
              })
            );
            subscribedTokensRef.current.add(token.mint);
          }
        });
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.message?.includes("Successfully subscribed")) {
            console.log("Subscription confirmed:", data.message);
            return;
          }

          if (data.txType === "create") {
            handleNewToken(data as TokenCreationEvent);
          }

          if (data.txType === "buy" || data.txType === "sell") {
            updateTokenMetrics({
              ...data,
              timestamp: Date.now(),
            });
          }
        } catch (error) {
          console.error("Error handling message:", error);
        }
      };

      wsRef.current.onclose = () => {
        console.log("WebSocket closed");
        isConnectingRef.current = false;
        setWsStatus("disconnected");

        if (wsRef.current !== undefined) {
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = undefined;
            if (!isConnectingRef.current && !wsRef.current) {
              connect();
            }
          }, 5000);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        isConnectingRef.current = false;
        setWsStatus("disconnected");
      };
    } catch (error) {
      console.error("Error setting up WebSocket:", error);
      isConnectingRef.current = false;
      setWsStatus("disconnected");
    }
  }, [cleanup, handleNewToken, updateTokenMetrics, tokens]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }

    subscribedTokensRef.current.forEach((mint) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            method: "unsubscribeTokenTrade",
            keys: [mint],
          })
        );
      }
    });

    cleanup();
    setWsStatus("disconnected");
    isConnectingRef.current = false;
    subscribedTokensRef.current.clear();
    tokenMetricsRef.current.clear();
  }, [cleanup]);

  const clearTokens = useCallback(() => {
    disconnect();
    setTokens([]);
    setTrades(new Map());
  }, [disconnect]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const downloadTokensAsCSV = useCallback(() => {
    const csvData = Papa.unparse(tokens, {
      columns: [
        "mint",
        "name",
        "symbol",
        "price",
        "timestamp",
        "creator",
        "marketCap",
        "initialBuy",
        "initialBuySol",
        "initialBuyPercent",
        "totalSupply",
        "volume24h",
        "holders",
        "liquidity",
      ],
    });
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "tokens.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [tokens]);

  const downloadTradesAsCSV = useCallback(() => {
    const allTrades: TradeEvent[] = [];
    trades.forEach((tokenTrades) => {
      allTrades.push(...tokenTrades);
    });
    const csvData = Papa.unparse(allTrades, {
      columns: [
        "mint",
        "traderPublicKey",
        "txType",
        "tokenAmount",
        "vSolInBondingCurve",
        "vTokensInBondingCurve",
        "timestamp",
        "marketCapSol",
      ],
    });
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "trades.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [trades]);

  const columnsWithPrediction = [
    ...columns,
    {
      id: "prediction",
      header: "ML Score",
      cell: ({ row }: any) => {
        const prediction = predictions.get(row.original.mint);
        if (!prediction) return null;

        return (
          <div className="text-right">
            <Badge
              className={
                prediction.probability > 0.8 ? "animate-pulse bg-green-500" : ""
              }
            >
              {(prediction.probability * 100).toFixed(1)}%
            </Badge>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <Card className="w-full h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle>New Tokens Scanner</CardTitle>
              <Badge>{wsStatus}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTokensAsCSV}
                disabled={tokens.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Tokens
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTradesAsCSV}
                disabled={trades.size === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Trades
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearTokens}
                disabled={tokens.length === 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear
              </Button>
              <Button
                variant={wsStatus === "connected" ? "destructive" : "default"}
                size="sm"
                onClick={wsStatus === "connected" ? disconnect : connect}
                disabled={isConnectingRef.current}
              >
                <Power className="w-4 h-4 mr-2" />
                {wsStatus === "connected" ? "Stop" : "Start"} Scanner
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columnsWithPrediction} data={tokens} />
        </CardContent>
      </Card>

      {selectedToken && (
        <TokenDetailsModal
          token={selectedToken}
          trades={trades.get(selectedToken.mint) || []}
          metrics={tokenMetricsRef.current.get(selectedToken.mint)}
          prediction={predictions.get(selectedToken.mint)}
          isOpen={!!selectedToken}
          onClose={() => setSelectedToken(undefined)}
        />
      )}
    </>
  );
}
