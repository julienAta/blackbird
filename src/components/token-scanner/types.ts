export interface TokenCreationEvent {
  signature: string;
  mint: string;
  traderPublicKey: string;
  txType: string;
  initialBuy: number;
  bondingCurveKey: string;
  vTokensInBondingCurve: number;
  vSolInBondingCurve: number;
  marketCapSol: number;
  name: string;
  symbol: string;
  uri: string;
}

// types.ts
export interface TokenData {
  mint: string;
  name: string;
  symbol: string;
  price: number;
  timestamp: number;
  creator: string;
  marketCap: number;
  initialBuy: number;
  initialBuySol: number;
  initialBuyPercent: number;
  totalSupply: number;
  volume24h: number;
  holders: number;
  liquidity: number;
  onSelect?: (token: TokenData) => void;
  priceUsd?: number;
  marketCapUsd?: number;
  volume24hUsd?: number;
}

export interface TradeEvent {
  signature: string;
  mint: string;
  traderPublicKey: string;
  txType: "buy" | "sell";
  amount: number;
  price: number;
  timestamp: number;
  vSolInBondingCurve: number;
  vTokensInBondingCurve: number;
}

export interface TokenDetailsProps {
  token: TokenData;
  trades: TradeEvent[];
  isOpen: boolean;
  onClose: () => void;
}

// types.ts
export interface TokenMetrics {
  holders: Set<string>;
  totalVolume: number; // Track total volume
  volumeByTime: {
    [timestamp: number]: number;
  };
  createdAt: number;
  trades: number; // Total trades
  buyCount: number; // Total buys
  sellCount: number; // Total sells
  uniqueTraders: Set<string>;
  lastPrice: number;
  highPrice: number;
  lowPrice: number;
}
