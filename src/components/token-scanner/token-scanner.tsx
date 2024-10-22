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

interface TokenMetrics {
  holders: Set<string>;
  volume24h: number;
  volumeByTime: {
    [timestamp: number]: number;
  };
  trades24h: number;
  buyCount24h: number;
  sellCount24h: number;
  uniqueTraders24h: Set<string>;
  lastPrice: number;
  highPrice24h: number;
  lowPrice24h: number;
}

export function TokenScanner() {
  // State management
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [selectedToken, setSelectedToken] = useState<TokenData | null>(null);
  const [trades, setTrades] = useState<Map<string, TradeEvent[]>>(new Map());
  const [wsStatus, setWsStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("disconnected");

  // Refs for persistent data
  const wsRef = useRef<WebSocket | null>(null);
  const subscribedTokensRef = useRef<Set<string>>(new Set());
  const tokenMetricsRef = useRef<Map<string, TokenMetrics>>(new Map());

  const initializeTokenMetrics = (mint: string, initialHolder: string) => {
    tokenMetricsRef.current.set(mint, {
      holders: new Set([initialHolder]),
      volume24h: 0,
      volumeByTime: {},
      trades24h: 0,
      buyCount24h: 0,
      sellCount24h: 0,
      uniqueTraders24h: new Set([initialHolder]),
      lastPrice: 0,
      highPrice24h: 0,
      lowPrice24h: Infinity,
    });
  };

  const handleTokenSelect = (token: TokenData) => {
    setSelectedToken(token);
    if (
      wsRef.current?.readyState === WebSocket.OPEN &&
      !subscribedTokensRef.current.has(token.mint)
    ) {
      wsRef.current.send(
        JSON.stringify({
          method: "subscribeTokenTrade",
          keys: [token.mint],
        })
      );
      subscribedTokensRef.current.add(token.mint);
      setTrades((prev) => new Map(prev).set(token.mint, []));
    }
  };

  const updateTokenMetrics = (trade: TradeEvent) => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    let metrics = tokenMetricsRef.current.get(trade.mint);
    if (!metrics) {
      initializeTokenMetrics(trade.mint, trade.traderPublicKey);
      metrics = tokenMetricsRef.current.get(trade.mint)!;
    }

    // Update holders
    metrics.holders.add(trade.traderPublicKey);

    // Update volume
    const tradeVolume = (trade.amount || 0) * (trade.price || 0);
    metrics.volume24h += tradeVolume;
    metrics.volumeByTime[trade.timestamp] = tradeVolume;

    // Clean up old volume data
    Object.keys(metrics.volumeByTime).forEach((timestamp: any) => {
      if (Number(timestamp) < oneDayAgo) {
        metrics!.volume24h -= metrics.volumeByTime[Number(timestamp)] || 0;
        delete metrics!.volumeByTime[timestamp];
      }
    });

    // Update trade counts
    metrics.trades24h++;
    if (trade.txType === "buy") {
      metrics.buyCount24h++;
    } else {
      metrics.sellCount24h++;
    }

    // Update unique traders
    metrics.uniqueTraders24h.add(trade.traderPublicKey);

    // Update price metrics
    metrics.lastPrice = trade.price;
    metrics.highPrice24h = Math.max(metrics.highPrice24h, trade.price);
    metrics.lowPrice24h = Math.min(metrics.lowPrice24h, trade.price);

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
            price: trade.price,
            volume24h: metrics!.volume24h,
            holders: metrics!.holders.size,
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

      // Resubscribe to existing token trades
      subscribedTokensRef.current.forEach((mint) => {
        wsRef.current?.send(
          JSON.stringify({
            method: "subscribeTokenTrade",
            keys: [mint],
          })
        );
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
          const tokenEvent = data as TokenCreationEvent;
          const initialBuySol =
            tokenEvent.initialBuy *
            (tokenEvent.vSolInBondingCurve / tokenEvent.vTokensInBondingCurve);
          const initialBuyPercent =
            (tokenEvent.initialBuy / tokenEvent.vTokensInBondingCurve) * 100;

          const newToken: TokenData = {
            mint: tokenEvent.mint,
            name: tokenEvent.name,
            symbol: tokenEvent.symbol,
            price:
              tokenEvent.vSolInBondingCurve / tokenEvent.vTokensInBondingCurve,
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

          setTokens((prev) => [newToken, ...prev].slice(0, 100));
          initializeTokenMetrics(tokenEvent.mint, tokenEvent.traderPublicKey);
        }

        if (data.txType === "buy" || data.txType === "sell") {
          const tradeEvent: TradeEvent = {
            ...data,
            timestamp: Date.now(),
          };
          updateTokenMetrics(tradeEvent);
        }
      } catch (error) {
        console.error("Error handling message:", error);
      }
    };

    wsRef.current.onclose = () => {
      console.log("WebSocket closed");
      setWsStatus("disconnected");
    };

    wsRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      setWsStatus("disconnected");
    };
  };

  const disconnect = () => {
    // Unsubscribe from all tokens
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return (
    <>
      <Card className="w-full">
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
