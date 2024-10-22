// components/token-scanner/token-details-modal.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink } from "lucide-react";
import { TokenData, TradeEvent } from "./types";

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

interface TokenDetailsModalProps {
  token: TokenData;
  trades: TradeEvent[];
  metrics: TokenMetrics | undefined;
  isOpen: boolean;
  onClose: () => void;
}

export function TokenDetailsModal({
  token,
  trades,
  metrics,
  isOpen,
  onClose,
}: TokenDetailsModalProps) {
  const calculatePriceChange = () => {
    if (!trades || trades.length < 2) return 0;
    const oldestPrice = trades[trades.length - 1].price;
    const currentPrice = trades[0].price;
    return ((currentPrice - oldestPrice) / oldestPrice) * 100;
  };

  const priceChange = calculatePriceChange();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              {token.name}
              <Badge variant="outline">{token.symbol}</Badge>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <a
                href={`https://pump.fun/token/${token.mint}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </DialogTitle>
          <DialogDescription className="flex items-center justify-between">
            <span>Created {new Date(token.timestamp).toLocaleString()}</span>
            <span className="font-mono text-sm">
              {token.mint.slice(0, 8)}...{token.mint.slice(-8)}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-4 my-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Market Cap</div>
            <div className="text-lg font-semibold">
              {token.marketCap.toFixed(2)} SOL
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">24h Volume</div>
            <div className="text-lg font-semibold">
              {metrics?.volume24h.toFixed(2) || "0"} SOL
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Holders</div>
            <div className="text-lg font-semibold">
              {metrics?.holders.size.toLocaleString() || "0"}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Liquidity</div>
            <div className="text-lg font-semibold">
              {token.liquidity.toFixed(2)} SOL
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">24h Trades</div>
            <div className="text-lg font-semibold">
              {metrics?.trades24h || 0}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span className="text-green-500">
                {metrics?.buyCount24h || 0} buys
              </span>
              <span className="text-red-500">
                {metrics?.sellCount24h || 0} sells
              </span>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">24h High/Low</div>
            <div className="text-lg font-semibold">
              {metrics?.highPrice24h.toFixed(6) || "0"} /{" "}
              {metrics?.lowPrice24h === Infinity
                ? "0"
                : metrics?.lowPrice24h.toFixed(6)}{" "}
              SOL
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Range:{" "}
              {(
                (metrics?.highPrice24h || 0) -
                (metrics?.lowPrice24h === Infinity
                  ? 0
                  : metrics?.lowPrice24h || 0)
              ).toFixed(6)}{" "}
              SOL
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">
              Unique Traders 24h
            </div>
            <div className="text-lg font-semibold">
              {metrics?.uniqueTraders24h.size || 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Avg. Trade:{" "}
              {((metrics?.volume24h || 0) / (metrics?.trades24h || 1)).toFixed(
                3
              )}{" "}
              SOL
            </div>
          </Card>
        </div>

        <div className="flex justify-between items-center mb-4 bg-secondary rounded-lg p-4">
          <div>
            <div className="text-sm text-muted-foreground">Current Price</div>
            <div className="text-2xl font-bold">
              {token.price.toFixed(6)} SOL
            </div>
            <div
              className={`text-sm ${
                priceChange >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {priceChange.toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-2">
              Initial Buy
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">
                {token.initialBuySol.toFixed(2)} SOL
              </Badge>
              <Badge variant="outline">
                {token.initialBuyPercent.toFixed(2)}% Supply
              </Badge>
            </div>
          </div>
          <Button size="lg" className="px-8">
            Buy
          </Button>
        </div>

        <div className="space-y-4">
          <div className="font-semibold">Recent Trades</div>
          <ScrollArea className="h-[200px] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Price (SOL)</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Trader</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades?.length > 0 ? (
                  trades.map((trade) => (
                    <TableRow key={trade.signature}>
                      <TableCell>
                        <Badge
                          variant={
                            trade.txType === "buy" ? "default" : "destructive"
                          }
                        >
                          {trade.txType.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {Number(trade.price || 0).toFixed(6)}
                      </TableCell>
                      <TableCell>
                        {Number(trade.amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {((trade.price || 0) * (trade.amount || 0)).toFixed(3)}
                      </TableCell>
                      <TableCell>
                        {new Date(trade.timestamp).toLocaleTimeString()}
                      </TableCell>
                      <TableCell className="font-mono">
                        {trade.traderPublicKey.slice(0, 4)}...
                        {trade.traderPublicKey.slice(-4)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                      No trades yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          <div>
            Created by: {token.creator.slice(0, 8)}...{token.creator.slice(-8)}
          </div>
          <div>Total Supply: {token.totalSupply.toLocaleString()}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
