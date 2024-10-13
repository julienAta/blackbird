const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=7d91ff22-2ce4-42f2-9901-eb31a62951e1`;

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  supply: number;
  decimals: number;
  pricePerToken: number;
  image: string;
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
    pricePerToken: result.token_info.price_info.price_per_token,
    image: result.content.links.image,
  };
}
