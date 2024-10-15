import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

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
  if (!HELIUS_RPC_URL) {
    throw new Error("Helius API key not configured");
  }

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

interface TokenHolder {
  address: string;
  amount: number;
}

export async function getTokenHolders(
  tokenAddress: string,
  limit: number = 100
): Promise<TokenHolder[]> {
  const connection = new Connection(HELIUS_RPC_URL);
  const tokenPublicKey = new PublicKey(tokenAddress);

  const accounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
    filters: [
      {
        dataSize: 165, // size of token account
      },
      {
        memcmp: {
          offset: 0,
          bytes: tokenPublicKey.toBase58(),
        },
      },
    ],
  });

  const holders: TokenHolder[] = accounts
    .map(({ account, pubkey }) => ({
      address: pubkey.toBase58(),
      amount: Number(account.data.readBigInt64LE(64)) / 10 ** 9, // Assuming 9 decimals, adjust if different
    }))
    .filter((holder) => holder.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);

  return holders;
}
