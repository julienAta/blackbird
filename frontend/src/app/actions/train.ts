// app/actions/train.ts
"use server";
import { TradeEvent, TokenData } from "@/components/token-scanner/types";
const ML_SERVICE_URL =
  process.env.ML_SERVICE_URL || "http://localhost:8000/api";

export async function trainModel(trades: TradeEvent[], tokens: TokenData[]) {
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
