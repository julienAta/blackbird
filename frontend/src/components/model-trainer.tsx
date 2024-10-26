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

interface TradeData {
  mint: string;
  traderPublicKey: string;
  txType: string;
  tokenAmount: number;
  vSolInBondingCurve: number;
  vTokensInBondingCurve: number;
  timestamp: number;
  marketCapSol: number;
}

interface TokenData {
  mint: string;
  initialBuySol: number;
  initialBuyPercent: number;
  liquidity: number;
  marketCap: number;
}
const formatTradeData = (trade: any) => ({
  mint: String(trade.mint || ""),
  traderPublicKey: String(trade.traderPublicKey || ""),
  txType: String(trade.txType || ""),
  tokenAmount: Number(trade.tokenAmount || 0),
  vSolInBondingCurve: Number(trade.vSolInBondingCurve || 0),
  vTokensInBondingCurve: Number(trade.vTokensInBondingCurve || 0),
  timestamp: Number(trade.timestamp || 0),
  marketCapSol: Number(trade.marketCapSol || 0),
});

const formatTokenData = (token: any) => ({
  mint: String(token.mint || ""),
  initialBuySol: Number(token.initialBuySol || 0),
  initialBuyPercent: Number(token.initialBuyPercent || 0),
  liquidity: Number(token.liquidity || 0),
  marketCap: Number(token.marketCap || 0),
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
          // Transform headers to match exactly what backend expects
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
        complete: (results) => {
          const data = results.data;
          console.log(`Parsed ${file.name}:`, {
            headers: results.meta.fields,
            rowCount: data.length,
            sampleRow: data[0],
          });
          resolve(data);
        },
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

      // Format data
      const trades = rawTrades.map(formatTradeData);
      const tokens = rawTokens.map(formatTokenData);

      // Log formatted data
      console.log("Formatted Data:", {
        tradeSample: trades[0],
        tokenSample: tokens[0],
        tradeColumns: Object.keys(trades[0]),
        tokenColumns: Object.keys(tokens[0]),
      });

      setProgress(70);

      // Train model
      const result = await trainModel(trades, tokens);

      if (!result.success) {
        throw new Error(result.error);
      }

      setStatus("success");
      setMessage(
        `Model trained successfully with ${trades.length} trades and ${tokens.length} tokens!`
      );
      setProgress(100);
    } catch (error) {
      console.error("Training failed:", error);
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Training failed");
    }
  };
  const parseFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log(`Parsed ${file.name}:`, {
            headers: results.meta.fields,
            firstRow: results.data[0],
            rowCount: results.data.length,
          });
          resolve(results.data);
        },
        error: reject,
      });
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-bold">
          Train Token Prediction Model
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
              Columns: mint, traderPublicKey, txType, tokenAmount,
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
