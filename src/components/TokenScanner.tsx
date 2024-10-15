"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Image from "next/image";
import { getTokenInfo, getTokenHolders } from "@/lib/solana";

const TokenScanner = () => {
  const [tokenAddress, setTokenAddress] = useState(
    "JBSVUpKgYNHt4GLtNebQxTJmZgftTMWENQrziHtGpump"
  );
  const [tokenInfo, setTokenInfo] = useState(null);
  const [tokenHolders, setTokenHolders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHolders, setIsLoadingHolders] = useState(false);
  const [error, setError] = useState("");

  const handleScan = async () => {
    setIsLoading(true);
    setError("");
    try {
      const info = await getTokenInfo(tokenAddress);
      setTokenInfo(info);
    } catch (err) {
      setError(`Failed to scan token: ${err.message}`);
      setTokenInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchHolders = async () => {
    setIsLoadingHolders(true);
    setError("");
    try {
      const holders = await getTokenHolders(tokenAddress, 100); // Fetch up to 100 holders
      setTokenHolders(holders);
      if (holders.length === 0) {
        setError(
          "No token holders found. This could be due to API limitations or the token might not have any holders."
        );
      }
    } catch (err) {
      setError(`Failed to fetch token holders: ${err.message}`);
    } finally {
      setIsLoadingHolders(false);
    }
  };

  const totalHoldersSupply = tokenHolders.reduce(
    (sum, holder) => sum + holder.amount,
    0
  );

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Token Scanner</CardTitle>
        <CardDescription>
          Enter a Solana token address to scan for token information and holders
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Input
            type="text"
            placeholder="Token Address"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
          />
          <Button onClick={handleScan} disabled={isLoading}>
            {isLoading ? "Scanning..." : "Scan Token"}
          </Button>
          {error && <p className="text-red-500">{error}</p>}
          {tokenInfo && (
            <div className="mt-4">
              <h3 className="font-semibold">Token Information:</h3>
              <div className="flex items-center space-x-4">
                {tokenInfo.image && (
                  <Image
                    src={tokenInfo.image}
                    alt={tokenInfo.name}
                    width={64}
                    height={64}
                  />
                )}
                <dl className="mt-2 space-y-1">
                  <div>
                    <dt className="inline font-semibold">Name:</dt>
                    <dd className="inline ml-1">{tokenInfo.name}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold">Symbol:</dt>
                    <dd className="inline ml-1">{tokenInfo.symbol}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold">Address:</dt>
                    <dd className="inline ml-1">{tokenInfo.address}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold">Supply:</dt>
                    <dd className="inline ml-1">
                      {tokenInfo.supply.toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold">Decimals:</dt>
                    <dd className="inline ml-1">{tokenInfo.decimals}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold">Price per Token:</dt>
                    <dd className="inline ml-1">
                      ${tokenInfo.pricePerToken.toFixed(6)} USDC
                    </dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold">Mint Authority:</dt>
                    <dd className="inline ml-1">{tokenInfo.mintAuthority}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold">Freeze Authority:</dt>
                    <dd className="inline ml-1">
                      {tokenInfo.freezeAuthority || "None"}
                    </dd>
                  </div>
                </dl>
              </div>
              <Button
                onClick={handleFetchHolders}
                disabled={isLoadingHolders}
                className="mt-4"
              >
                {isLoadingHolders
                  ? "Fetching Holders..."
                  : "Fetch Token Holders"}
              </Button>
              {tokenHolders.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold">Token Holders:</h3>
                  <p>Displaying top {tokenHolders.length} holders</p>
                  <p>
                    Total supply held by displayed holders:{" "}
                    {totalHoldersSupply.toLocaleString()} tokens
                  </p>
                  <ul className="mt-2 space-y-1 max-h-60 overflow-y-auto">
                    {tokenHolders.map((holder, index) => (
                      <li key={index}>
                        <span className="font-medium">{holder.address}</span>:{" "}
                        {holder.amount.toLocaleString()} tokens
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TokenScanner;
