import { TokenData, TradeEvent } from "@/components/token-scanner/types";

// services/predictor.ts
export async function predictToken(trades: TradeEvent[], token: TokenData) {
  try {
    const response = await fetch("http://localhost:8000/api/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        trades,
        token: {
          mint: token.mint,
          initialBuySol: token.initialBuySol,
          initialBuyPercent: token.initialBuyPercent,
          liquidity: token.liquidity,
          marketCap: token.marketCap,
        },
      }),
    });

    if (!response.ok) {
      throw new Error("Prediction failed");
    }

    const prediction = await response.json();
    return prediction;
  } catch (error) {
    console.error("Prediction error:", error);
    return null;
  }
}
