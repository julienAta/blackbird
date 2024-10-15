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

export async function getTokenInfo(tokenAddress: string): Promise<TokenInfo> {
  const response = await fetch(HELIUS_RPC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "my-id",
      method: "getAsset",
      params: {
        id: tokenAddress,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`API error: ${data.error.message}`);
  }

  const result = data.result;

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

interface TokenAccount {
  address: string;
  mint: string;
  owner: string;
  amount: number;
  delegatedAmount: number;
  frozen: boolean;
}

export async function getTokenAccounts(
  mintAddress: string,
  limit: number = 1000
): Promise<TokenAccount[]> {
  const response = await fetch(HELIUS_RPC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "helius-test",
      method: "getTokenAccounts",
      params: {
        mint: mintAddress,
        limit: limit,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`API error: ${data.error.message}`);
  }

  return data.result.token_accounts.map((account) => ({
    address: account.address,
    mint: account.mint,
    owner: account.owner,
    amount: account.amount,
    delegatedAmount: account.delegated_amount,
    frozen: account.frozen,
  }));
}
