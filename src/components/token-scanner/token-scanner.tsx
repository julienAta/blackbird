"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Power, Trash2 } from "lucide-react";
import { DataTable } from "./data-table";
import { TokenDetailsModal } from "./token-details-modal";
import { columns } from "./columns";
import { TokenData, TokenCreationEvent, TradeEvent } from "./types";
import { useQuery } from "@tanstack/react-query";
import { fetchSolPrice } from "@/app/actions/token";
import { TokenMetrics } from "./types";

const BUFFER_INTERVAL = 1000;
const MAX_TOKENS = 1000;
const MAX_TRADES_PER_TOKEN = 5000;

export function TokenScanner() {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [selectedToken, setSelectedToken] = useState<TokenData | null>(null);
  const [trades, setTrades] = useState<Map<string, TradeEvent[]>>(new Map());
  const [wsStatus, setWsStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("disconnected");

  const wsRef = useRef<WebSocket | null>(null);
  const subscribedTokensRef = useRef<Set<string>>(new Set());
  const tokenMetricsRef = useRef<Map<string, TokenMetrics>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef<boolean>(false);

  const pendingTokenUpdatesRef = useRef<Map<string, Partial<TokenData>>>(
    new Map()
  );
  const pendingTradeUpdatesRef = useRef<Map<string, TradeEvent[]>>(new Map());
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: solPrice = 0 } = useQuery({
    queryKey: ["solPrice"],
    queryFn: fetchSolPrice,
    refetchInterval: 60000,
  });

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

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
    if (
      pendingTokenUpdatesRef.current.size === 0 &&
      pendingTradeUpdatesRef.current.size === 0
    )
      return;

    setTokens((prev) => {
      const updatedTokens = [...prev];
      pendingTokenUpdatesRef.current.forEach((token, mint) => {
        const index = updatedTokens.findIndex((t) => t.mint === mint);
        if (index !== -1) {
          updatedTokens[index] = { ...updatedTokens[index], ...token };
        }
      });
      return updatedTokens;
    });

    setTrades((prev) => {
      const newTrades = new Map(prev);
      pendingTradeUpdatesRef.current.forEach((tradeUpdates, mint) => {
        const existingTrades = newTrades.get(mint) || [];
        newTrades.set(
          mint,
          [...tradeUpdates, ...existingTrades].slice(0, MAX_TRADES_PER_TOKEN)
        );
      });
      return newTrades;
    });

    pendingTokenUpdatesRef.current.clear();
    pendingTradeUpdatesRef.current.clear();
  }, []);

  const bufferUpdates = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    updateTimeoutRef.current = setTimeout(() => {
      flushUpdates();
      updateTimeoutRef.current = null;
    }, BUFFER_INTERVAL);
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

      const pendingTrades =
        pendingTradeUpdatesRef.current.get(trade.mint) || [];
      pendingTradeUpdatesRef.current.set(trade.mint, [trade, ...pendingTrades]);

      bufferUpdates();
    },
    [solPrice, getTradeTotalSol, initializeTokenMetrics, bufferUpdates]
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

        if (wsRef.current !== null) {
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
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
      reconnectTimeoutRef.current = null;
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
          <DataTable columns={columns} data={tokens} />
        </CardContent>
      </Card>

      {selectedToken && (
        <TokenDetailsModal
          token={selectedToken}
          trades={trades.get(selectedToken.mint) || []}
          metrics={tokenMetricsRef.current.get(selectedToken.mint)}
          isOpen={!!selectedToken}
          onClose={() => setSelectedToken(null)}
        />
      )}
    </>
  );
}
