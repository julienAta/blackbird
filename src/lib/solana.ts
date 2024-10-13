import { Connection, PublicKey } from "@solana/web3.js";

const SOLANA_RPC_ENDPOINT =
  "https://mainnet.helius-rpc.com/?api-key=7d91ff22-2ce4-42f2-9901-eb31a62951e1";

interface TokenMetadata {
  address: string;
  name: string;
  symbol: string;
}

interface TransactionSignature {
  signature: string;
  blockTime: number;
}

export async function getTokenMetadata(
  tokenAddress: string
): Promise<TokenMetadata> {
  const connection = new Connection(SOLANA_RPC_ENDPOINT);
  const mintPublicKey = new PublicKey(tokenAddress);

  const [metadataAddress] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(),
      mintPublicKey.toBuffer(),
    ],
    new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
  );

  const metadataInfo = await connection.getAccountInfo(metadataAddress);
  let name = "Unknown";
  let symbol = "UNKNOWN";
  if (metadataInfo && metadataInfo.data) {
    name = metadataInfo.data.slice(1, 33).toString().replace(/\0/g, "");
    symbol = metadataInfo.data.slice(33, 65).toString().replace(/\0/g, "");
  }

  return {
    address: tokenAddress,
    name,
    symbol,
  };
}

export async function getInitialTransactions(
  tokenAddress: string,
  limit: number = 20
): Promise<TransactionSignature[]> {
  const connection = new Connection(SOLANA_RPC_ENDPOINT);
  const mintPublicKey = new PublicKey(tokenAddress);

  const signatures = await connection.getSignaturesForAddress(mintPublicKey, {
    limit,
  });

  return signatures.map((sig) => ({
    signature: sig.signature,
    blockTime: sig.blockTime || 0,
  }));
}
