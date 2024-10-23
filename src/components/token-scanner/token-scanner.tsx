"use client";
import { useEffect, useRef, useState } from "react";
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

interface TokenMetrics {
  holders: Set<string>;
  totalVolume: number;
  volumeByTime: {
    [timestamp: number]: number;
  };
  createdAt: number;
  trades: number;
  buyCount: number;
  sellCount: number;
  uniqueTraders: Set<string>;
  lastPrice: number;
  highPrice: number;
  lowPrice: number;
}

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
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const { data: solPrice = 0 } = useQuery({
    queryKey: ["solPrice"],
    queryFn: fetchSolPrice,
    refetchInterval: 60000, // Refetch every minute
  });

  const initializeTokenMetrics = (mint: string, initialHolder: string) => {
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
    });
  };

  const handleTokenSelect = (token: TokenData) => {
    setSelectedToken(token);
  };

  const handleNewToken = (tokenEvent: TokenCreationEvent) => {
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
      timestamp: Date.now(), // Creation timestamp
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

    setTokens((prev) => [newToken, ...prev].slice(0, 100));
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
  };
  const getTradeTotalSol = (trade: TradeEvent) => {
    return (
      (trade.tokenAmount || 0) *
      (trade.vSolInBondingCurve / trade.vTokensInBondingCurve)
    );
  };
  const updateTokenMetrics = (trade: TradeEvent) => {
    let metrics = tokenMetricsRef.current.get(trade.mint);
    if (!metrics) {
      initializeTokenMetrics(trade.mint, trade.traderPublicKey);
      metrics = tokenMetricsRef.current.get(trade.mint)!;
    }
    const totalTradeSol = getTradeTotalSol(trade);
    // Calculate volume from bonding curve values
    const tradeVolume = trade.vSolInBondingCurve || 0;

    metrics.totalVolume = metrics.totalVolume + totalTradeSol;
    metrics.volumeByTime[trade.timestamp] = metrics.totalVolume;
    metrics.trades++;

    if (trade.txType === "buy") {
      metrics.buyCount++;
    } else {
      metrics.sellCount++;
    }

    // Update holders and traders
    metrics.holders.add(trade.traderPublicKey);
    metrics.uniqueTraders.add(trade.traderPublicKey);

    // Update price metrics
    metrics.lastPrice = trade.vSolInBondingCurve / trade.vTokensInBondingCurve;
    metrics.highPrice = Math.max(metrics.highPrice, metrics.lastPrice);
    metrics.lowPrice = Math.min(metrics.lowPrice, metrics.lastPrice);

    // Update trades list
    setTrades((prev) => {
      const newTrades = new Map(prev);
      const tokenTrades = newTrades.get(trade.mint) || [];
      newTrades.set(trade.mint, [trade, ...tokenTrades].slice(0, 50));
      return newTrades;
    });

    // Update token state
    setTokens((prev) =>
      prev.map((token) => {
        if (token.mint === trade.mint) {
          return {
            ...token,
            price: metrics!.lastPrice,
            priceUsd: metrics!.lastPrice * solPrice,
            volume24h: metrics!.totalVolume,
            volume24hUsd: metrics!.totalVolume * solPrice,
            marketCap: trade.marketCapSol,
            holders: metrics!.holders.size,
            onSelect: handleTokenSelect,
          };
        }
        return token;
      })
    );
  };
  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setWsStatus("connecting");
    wsRef.current = new WebSocket("wss://pumpportal.fun/api/data");

    wsRef.current.onopen = () => {
      console.log("Connected to WebSocket");
      setWsStatus("connected");

      // Subscribe to new tokens
      wsRef.current?.send(
        JSON.stringify({
          method: "subscribeNewToken",
        })
      );

      // Resubscribe to existing tokens
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
      setWsStatus("disconnected");
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(connect, 5000);
    };

    wsRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      setWsStatus("disconnected");
    };
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
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

    wsRef.current?.close();
    setWsStatus("disconnected");
    subscribedTokensRef.current.clear();
    tokenMetricsRef.current.clear();
  };

  const clearTokens = () => {
    disconnect();
    setTokens([]);
    setTrades(new Map());
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

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
