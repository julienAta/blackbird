"use client";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Power, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import { columns } from "./columns";
import { TokenData, TokenCreationEvent } from "@/lib/types";

const TokenScanner = () => {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [wsStatus, setWsStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("disconnected");
  const wsRef = useRef<WebSocket | null>(null);

  const table = useReactTable({
    data: tokens,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

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
            ].slice(0, 100)
          ); // Keep last 100 tokens
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    {wsStatus === "connected"
                      ? "Waiting for new tokens..."
                      : "Start the scanner to monitor new tokens"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default TokenScanner;
