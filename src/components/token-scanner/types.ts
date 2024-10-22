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
}
