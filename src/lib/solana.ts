import { Connection, PublicKey } from "@solana/web3.js";

const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=7d91ff22-2ce4-42f2-9901-eb31a62951e1`;

interface TokenInfo {
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

interface TokenAccount {
  address: string;
  mint: string;
  owner: string;
  amount: number;
  delegatedAmount: number;
  frozen: boolean;
}

interface TokenAccountsResponse {
  total: number;
  limit: number;
  page: number;
  token_accounts: TokenAccount[];
}

interface TokenBalance {
  mint: string;
  amount: number;
  decimals: number;
  tokenName?: string;
  tokenSymbol?: string;
}

async function callHeliusAPI(method: string, params: any): Promise<any> {
  const response = await fetch(HELIUS_RPC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "helius-request",
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`API error: ${data.error.message}`);
  }

  return data.result;
}

export async function getTokenInfo(tokenAddress: string): Promise<TokenInfo> {
  const result = await callHeliusAPI("getAsset", { id: tokenAddress });

  return {
    address: result.id,
    name: result.content.metadata.name,
    symbol: result.content.metadata.symbol,
    supply: result.token_info.supply,
    decimals: result.token_info.decimals,
    pricePerToken: result.token_info.price_info?.price_per_token || 0,
    image: result.content.links.image,
    mintAuthority: result.mints?.[0]?.mint_authority || "Not available",
    freezeAuthority: result.mints?.[0]?.freeze_authority || null,
    isInitialized: result.mints?.[0]?.is_initialized || false,
    lastUpdateSlot: result.last_update_slot || 0,
    extensions: result.mints?.[0]?.extensions || {},
  };
}

export async function getTokenAccounts(
  mintAddress: string,
  page: number = 1,
  limit: number = 1000
): Promise<TokenAccountsResponse> {
  return callHeliusAPI("getTokenAccounts", {
    mint: mintAddress,
    page,
    limit,
    displayOptions: {
      showZeroBalance: false,
    },
  });
}

export async function getAllTokenAccounts(
  mintAddress: string
): Promise<TokenAccount[]> {
  let allAccounts: TokenAccount[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await getTokenAccounts(mintAddress, page, 1000);
    allAccounts = [...allAccounts, ...response.token_accounts];
    hasMore = response.token_accounts.length === 1000;
    page++;
  }

  return allAccounts;
}

export async function getTokenBalances(
  walletAddress: string
): Promise<TokenBalance[]> {
  const result = await callHeliusAPI("getTokenBalances", {
    wallet: walletAddress,
  });
  return result.tokens;
}

export async function analyzeTokenHolders(
  mintAddress: string,
  totalSupply: number
): Promise<{
  largeHolders: TokenAccount[];
  suspiciousAccounts: TokenAccount[];
}> {
  const accounts = await getAllTokenAccounts(mintAddress);
  const largeHolderThreshold = totalSupply * 0.01; // 1% of total supply

  const largeHolders = accounts.filter(
    (account) => account.amount > largeHolderThreshold
  );

  const suspiciousAccounts = accounts.filter(
    (account) => account.amount % 1000000 === 0 && account.amount > 0
  );

  return {
    largeHolders,
    suspiciousAccounts,
  };
}

export function createConnection(): Connection {
  return new Connection(HELIUS_RPC_URL);
}
