export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  supply: number;
  decimals: number;
  pricePerToken: number;
  image: string;
  mintAuthority: string;
  freezeAuthority: string | null;
  isInitialized: boolean;
  lastUpdateSlot: number;
  extensions?: Record<string, any>;
}

export interface TokenAccount {
  address: string;
  mint: string;
  owner: string;
  amount: number;
  delegatedAmount: number;
  frozen: boolean;
}

export interface TokenBalance {
  mint: string;
  amount: number;
  decimals: number;
  tokenName?: string;
  tokenSymbol?: string;
}
