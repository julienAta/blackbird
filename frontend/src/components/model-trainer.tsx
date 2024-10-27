// components/model-trainer.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import Papa from "papaparse";
import { trainModel } from "@/app/actions/train";
import { TokenData, TradeEvent } from "@/components/token-scanner/types";

// Helper function to track holder counts
const processTradesWithHolders = (trades: any[]): TradeEvent[] => {
  const holdersByMint = new Map<string, Map<string, number>>();
  const processedTrades: TradeEvent[] = [];

  // Sort trades by timestamp
  const sortedTrades = [...trades].sort((a, b) => a.timestamp - b.timestamp);

  for (const trade of sortedTrades) {
    const mint = trade.mint;
    if (!holdersByMint.has(mint)) {
      holdersByMint.set(mint, new Map());
    }

    const holders = holdersByMint.get(mint)!;
    const trader = trade.traderPublicKey;
    const currentBalance = holders.get(trader) || 0;
    let newBalance = currentBalance;

    if (trade.txType === "buy") {
      newBalance = currentBalance + Number(trade.tokenAmount);
    } else if (trade.txType === "sell") {
      newBalance = currentBalance - Number(trade.tokenAmount);
    }

    // Update or remove holder based on balance
    if (newBalance > 0) {
      holders.set(trader, newBalance);
    } else {
      holders.delete(trader);
    }

    // Create processed trade with holder count
    processedTrades.push({
      mint: String(trade.mint),
      traderPublicKey: String(trade.traderPublicKey),
      txType: trade.txType as "buy" | "sell",
      tokenAmount: Number(trade.tokenAmount),
      vSolInBondingCurve: Number(trade.vSolInBondingCurve),
      vTokensInBondingCurve: Number(trade.vTokensInBondingCurve),
      timestamp: Number(trade.timestamp),
      marketCapSol: Number(trade.marketCapSol),
      holdersCount: holders.size,
      ...trade,
    });
  }

  return processedTrades;
};

const formatTokenData = (token: any): TokenData => ({
  mint: String(token.mint || ""),
  name: String(token.name || ""),
  symbol: String(token.symbol || ""),
  price: Number(token.price || 0),
  timestamp: Number(token.timestamp || 0),
  creator: String(token.creator || ""),
  marketCap: Number(token.marketCap || 0),
  initialBuy: Number(token.initialBuy || 0),
  initialBuySol: Number(token.initialBuySol || 0),
  initialBuyPercent: Number(token.initialBuyPercent || 0),
  totalSupply: Number(token.totalSupply || 0),
  volume24h: Number(token.volume24h || 0),
  holders: Number(token.holders || 1),
  liquidity: Number(token.liquidity || 0),
});

export function ModelTrainer() {
  const [tradesFile, setTradesFile] = useState<File | null>(null);
  const [tokensFile, setTokensFile] = useState<File | null>(null);
  const [status, setStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [dataStats, setDataStats] = useState<any>(null);

  const parseCSV = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        transformHeader: (header) => {
          const headerMap: { [key: string]: string } = {
            traderpublickey: "traderPublicKey",
            tokenamount: "tokenAmount",
            vsolinbondingcurve: "vSolInBondingCurve",
            vtokensinbondingcurve: "vTokensInBondingCurve",
            marketcapsol: "marketCapSol",
            initialbuysol: "initialBuySol",
            initialbuypercent: "initialBuyPercent",
            txtype: "txType",
          };
          const normalizedHeader = header.toLowerCase().trim();
          return headerMap[normalizedHeader] || header;
        },
        complete: (results) => resolve(results.data),
        error: reject,
      });
    });
  };

  const processFiles = async () => {
    if (!tradesFile || !tokensFile) {
      setMessage("Please select both files");
      return;
    }

    setStatus("processing");
    setProgress(10);

    try {
      // Parse files
      const rawTrades = await parseCSV(tradesFile);
      setProgress(30);

      const rawTokens = await parseCSV(tokensFile);
      setProgress(50);

      // Process trades to include holder counts
      const processedTrades = processTradesWithHolders(rawTrades);
      const tokens = rawTokens.map(formatTokenData);

      // Calculate stats
      const stats = {
        originalTrades: rawTrades.length,
        originalTokens: rawTokens.length,
        validTrades: processedTrades.length,
        validTokens: tokens.length,
        uniqueTradeMints: new Set(processedTrades.map((t) => t.mint)).size,
        uniqueTokenMints: new Set(tokens.map((t) => t.mint)).size,
        successfulTokens: tokens.filter((t) => t.marketCap >= 60).length,
      };
      setDataStats(stats);
      setProgress(70);

      // Train model
      const result = await trainModel(processedTrades, tokens);

      if (!result.success) {
        throw new Error(result.error);
      }

      setStatus("success");
      setMessage(
        `Model trained successfully with ${processedTrades.length} trades and ${tokens.length} tokens!`
      );
      setProgress(100);
    } catch (error) {
      console.error("Training failed:", error);
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Training failed");
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-bold">
          Train Token Prediction Model
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rest of your UI remains the same */}
        <div className="grid gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Trades Dataset</label>
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => setTradesFile(e.target.files?.[0] || null)}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Required: mint, traderPublicKey, txType, tokenAmount,
              vSolInBondingCurve, vTokensInBondingCurve, timestamp, marketCapSol
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tokens Dataset</label>
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => setTokensFile(e.target.files?.[0] || null)}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Required: mint, initialBuySol, initialBuyPercent, liquidity,
              marketCap
            </p>
          </div>

          {dataStats && (
            <Alert className="bg-secondary">
              <div className="text-sm space-y-1">
                <p>
                  Original Data: {dataStats.originalTrades} trades,{" "}
                  {dataStats.originalTokens} tokens
                </p>
                <p>
                  Valid Data: {dataStats.validTrades} trades,{" "}
                  {dataStats.validTokens} tokens
                </p>
                <p>
                  Unique Mints: {dataStats.uniqueTradeMints} in trades,{" "}
                  {dataStats.uniqueTokenMints} in tokens
                </p>
                <p>
                  Successful Tokens: {dataStats.successfulTokens} (≥60k
                  marketCap)
                </p>
              </div>
            </Alert>
          )}

          {status === "processing" && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-center text-muted-foreground">
                Processing files and training model...
              </p>
            </div>
          )}

          {status === "success" && (
            <Alert className="bg-green-50">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-600">
                {message}
              </AlertDescription>
            </Alert>
          )}

          {status === "error" && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={processFiles}
            disabled={!tradesFile || !tokensFile || status === "processing"}
            className="w-full"
          >
            {status === "processing" ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Training...
              </div>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Train Model
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
