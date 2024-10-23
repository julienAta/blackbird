"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
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
import { TokenData, TradeEvent, TokenMetrics } from "./types";
import { useQuery } from "@tanstack/react-query";
import { fetchSolPrice } from "@/app/actions/token";

interface TokenDetailsModalProps {
  token: TokenData;
  trades: TradeEvent[];
  metrics: TokenMetrics | undefined;
  isOpen: boolean;
  onClose: () => void;
}

const formatNumber = (
  value: number | undefined | null,
  decimals: number = 2
): string => {
  if (value === undefined || value === null) return "0";
  return Number(value).toFixed(decimals);
};

const formatUsd = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return "$0.00";
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatPercentage = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return "0";
  return Number(value).toFixed(2);
};

export function TokenDetailsModal({
  token,
  trades,
  metrics,
  isOpen,
  onClose,
}: TokenDetailsModalProps) {
  const { data: solPrice = 0 } = useQuery({
    queryKey: ["solPrice"],
    queryFn: fetchSolPrice,
    refetchInterval: 60000,
  });

  const calculatePriceChange = () => {
    if (!trades || trades.length < 2) return 0;
    const oldestPrice = trades[trades.length - 1].price || 0;
    const currentPrice = trades[0].price || 0;
    return oldestPrice === 0
      ? 0
      : ((currentPrice - oldestPrice) / oldestPrice) * 100;
  };

  const priceChange = calculatePriceChange();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">
              {token.name} ({token.symbol})
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 my-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Market Cap</div>
            <div className="text-lg font-semibold">
              {formatNumber(token.marketCap, 2)} SOL
              <div className="text-xs text-muted-foreground">
                {formatUsd(token.marketCap * solPrice)}
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Volume</div>
            <div className="text-lg font-semibold">
              {formatNumber(metrics?.totalVolume, 2)} SOL
              <div className="text-xs text-muted-foreground">
                {formatUsd((metrics?.totalVolume || 0) * solPrice)}
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Holders</div>
            <div className="text-lg font-semibold">
              {metrics?.holders?.size?.toLocaleString() || "0"}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Liquidity</div>
            <div className="text-lg font-semibold">
              {formatNumber(token.liquidity, 2)} SOL
              <div className="text-xs text-muted-foreground">
                {formatUsd(token.liquidity * solPrice)}
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Trades</div>
            <div className="text-lg font-semibold">{metrics?.trades || 0}</div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span className="text-green-500">
                {metrics?.buyCount || 0} buys
              </span>
              <span className="text-red-500">
                {metrics?.sellCount || 0} sells
              </span>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Price High/Low</div>
            <div className="text-lg font-semibold">
              {formatNumber(metrics?.highPrice, 6)} /{" "}
              {metrics?.lowPrice === Infinity
                ? "0"
                : formatNumber(metrics?.lowPrice, 6)}{" "}
              SOL
              <div className="text-xs text-muted-foreground">
                {formatUsd((metrics?.highPrice || 0) * solPrice)} /{" "}
                {formatUsd(
                  (metrics?.lowPrice === Infinity
                    ? 0
                    : metrics?.lowPrice || 0) * solPrice
                )}
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Unique Traders</div>
            <div className="text-lg font-semibold">
              {metrics?.uniqueTraders?.size || 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Avg. Trade:{" "}
              {formatNumber(
                (metrics?.totalVolume || 0) / (metrics?.trades || 1),
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
              {formatNumber(token.price, 6)} SOL
              <div className="text-sm text-muted-foreground">
                {formatUsd(token.price * solPrice)}
              </div>
            </div>
            <div
              className={`text-sm ${
                priceChange >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {formatPercentage(priceChange)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-2">
              Initial Buy
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">
                {formatNumber(token.initialBuySol, 2)} SOL
                <span className="text-xs ml-1 text-muted-foreground">
                  ({formatUsd(token.initialBuySol * solPrice)})
                </span>
              </Badge>
              <Badge variant="outline">
                {formatNumber(token.initialBuyPercent, 2)}% Supply
              </Badge>
            </div>
          </div>
          <Button
            size="lg"
            className="px-8"
            onClick={() =>
              window.open(`https://pump.fun/${token.mint}`, "_blank")
            }
          >
            Trade
          </Button>
        </div>

        <div className="space-y-4">
          <div className="font-semibold">Recent Trades</div>
          <ScrollArea className="h-[200px] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
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
                          className={
                            trade.txType === "buy"
                              ? "bg-green-500"
                              : "bg-red-500"
                          }
                        >
                          {trade.txType.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>{formatNumber(trade.price, 6)} SOL</div>
                        <div className="text-xs text-muted-foreground">
                          {formatUsd(trade.price * solPrice)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {Number(trade.amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div>
                          {formatNumber(
                            (trade.price || 0) * (trade.amount || 0),
                            3
                          )}{" "}
                          SOL
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatUsd(
                            (trade.price || 0) * (trade.amount || 0) * solPrice
                          )}
                        </div>
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
