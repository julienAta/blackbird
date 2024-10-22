"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Power, Trash2 } from "lucide-react";
import { columns } from "./columns";
import { DataTable } from "./data-table";
import {
  TokenData,
  TokenCreationEvent,
} from "@/components/token-scanner/types";

export default function TokenScanner() {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [wsStatus, setWsStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("disconnected");
  const wsRef = useRef<WebSocket | null>(null);

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setWsStatus("connecting");
    wsRef.current = new WebSocket("wss://pumpportal.fun/api/data");

    wsRef.current.onopen = () => {
      console.log("Connected to WebSocket");
      setWsStatus("connected");
      wsRef.current?.send(
        JSON.stringify({
          method: "subscribeNewToken",
        })
      );
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
                initialBuySol,
                initialBuyPercent,
                totalSupply: tokenEvent.vTokensInBondingCurve,
                volume24h: 0, // This would need to be updated via another subscription
                holders: 1, // Initial holder count
                liquidity: tokenEvent.vSolInBondingCurve,
              },
              ...prev,
            ].slice(0, 100)
          );
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
    wsRef.current?.close();
    setWsStatus("disconnected");
  };

  const clearTokens = () => {
    setTokens([]);
  };

  useEffect(() => {
    return () => wsRef.current?.close();
  }, []);

  return (
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
  );
}
