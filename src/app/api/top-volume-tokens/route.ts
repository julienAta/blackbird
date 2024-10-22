// app/api/top-volume-tokens/route.ts
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeframe = searchParams.get("timeframe") || "24h";

  try {
    const response = await fetch("https://tokens.jup.ag/tokens", {
      headers: {
        Referer: "http://localhost:3000", // Replace with your actual domain in production
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch data from Jupiter API");
    }

    const allTokens = await response.json();

    // Sort tokens by daily volume (descending) and get top 10
    const topTokens = allTokens
      .filter((token) => token.daily_volume != null)
      .sort((a, b) => b.daily_volume - a.daily_volume)
      .slice(0, 10);

    return NextResponse.json(topTokens);
  } catch (error) {
    console.error("Error in API route:", error);
    return NextResponse.json(
      { error: "Error fetching token data" },
      { status: 500 }
    );
  }
}
