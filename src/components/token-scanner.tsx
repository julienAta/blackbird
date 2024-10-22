"use client";
import React, { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import WebSocketManager from "@/lib/websocketManager";

// First, let's define the correct interface for the token data
interface TokenCreationEvent {
  signature: string;
  mint: string;
  traderPublicKey: string;
  txType: string;
  initialBuy: number;
  bondingCurveKey: string;
  vTokensInBondingCurve: number;
  vSolInBondingCurve: number;
  marketCapSol: number;
  name: string;
  symbol: string;
  uri: string;
}

interface TokenData {
  mint: string;
  name: string;
  symbol: string;
  price: number;
  timestamp: number;
  creator: string;
  marketCap: number;
  initialBuy: number;
}

const TokenScanner = () => {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [wsStatus, setWsStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const connect = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      wsRef.current = new WebSocket("wss://pumpportal.fun/api/data");

      wsRef.current.onopen = () => {
        console.log("Connected to WebSocket");
        setWsStatus("connected");
        // Subscribe to new token events
        wsRef.current?.send(
          JSON.stringify({
            method: "subscribeNewToken",
          })
        );
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle subscription confirmation
          if (data.message?.includes("Successfully subscribed")) {
            console.log("Subscription confirmed:", data.message);
            return;
          }

          // Handle token creation events
          if (data.txType === "create") {
            const tokenEvent = data as TokenCreationEvent;
            setTokens((prev) =>
              [
                {
                  mint: tokenEvent.mint,
                  name: tokenEvent.name,
                  symbol: tokenEvent.symbol,
                  price:
                    tokenEvent.vSolInBondingCurve /
                    tokenEvent.vTokensInBondingCurve,
                  timestamp: Date.now(),
                  creator: tokenEvent.traderPublicKey,
                  marketCap: tokenEvent.marketCapSol,
                  initialBuy: tokenEvent.initialBuy,
                },
                ...prev,
              ].slice(0, 50)
            );
          }
        } catch (error) {
          console.error("Error handling message:", error);
        }
      };

      wsRef.current.onclose = () => {
        console.log("WebSocket closed");
        setWsStatus("disconnected");
        setTimeout(connect, 5000);
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setWsStatus("disconnected");
      };
    };

    connect();
    return () => wsRef.current?.close();
  }, []);

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          New Tokens Scanner
          <Badge>{wsStatus}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tokens.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Waiting for new tokens...
            </div>
          ) : (
            tokens.map((token) => (
              <Card key={token.mint} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold">{token.name}</h3>
                      <Badge variant="outline">{token.symbol}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(token.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {token.mint.slice(0, 8)}...{token.mint.slice(-8)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Creator: {token.creator.slice(0, 8)}...
                      {token.creator.slice(-4)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-right">
                      <div className="font-medium">
                        {token.initialBuy.toLocaleString()} tokens
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Initial Buy
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {token.marketCap.toFixed(2)} SOL
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Market Cap
                      </div>
                    </div>
                    <a
                      href={`https://pump.fun/token/${token.mint}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-accent rounded-full transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TokenScanner;
