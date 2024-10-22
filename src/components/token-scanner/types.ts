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
  onSelect: (token: TokenData) => void;
}

export interface TradeEvent {
  signature: string;
  mint: string;
  traderPublicKey: string;
  txType: "buy" | "sell";
  amount: number;
  price: number;
  timestamp: number;
}

export interface TokenDetailsProps {
  token: TokenData;
  trades: TradeEvent[];
  isOpen: boolean;
  onClose: () => void;
}

export interface TokenMetrics {
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
