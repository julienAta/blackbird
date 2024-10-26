// app/actions/train.ts
"use server";

const ML_SERVICE_URL =
  process.env.ML_SERVICE_URL || "http://localhost:8000/api";

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

export async function trainModel(trades: TradeData[], tokens: TokenData[]) {
  try {
    console.log("Training data sample:", {
      tradeSample: trades[0],
      tokenSample: tokens[0],
      tradesTotalCount: trades.length,
      tokensTotalCount: tokens.length,
    });

    const response = await fetch(`${ML_SERVICE_URL}/train`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ trades, tokens }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Training failed:", data);
      throw new Error(data.detail || "Training failed");
    }

    return { success: true, data };
  } catch (error) {
    console.error("Training error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Training failed",
    };
  }
}
