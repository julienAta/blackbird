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
import { getTokenInfo } from "@/lib/solana";

const TokenScanner = () => {
  const [tokenAddress, setTokenAddress] = useState(
    "JBSVUpKgYNHt4GLtNebQxTJmZgftTMWENQrziHtGpump"
  );
  const [tokenInfo, setTokenInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleScan = async () => {
    setIsLoading(true);
    setError("");
    try {
      const info = await getTokenInfo(tokenAddress);
      setTokenInfo(info);
    } catch (err) {
      setError("Failed to scan token. Please check the address and try again.");
      setTokenInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Token Scanner</CardTitle>
        <CardDescription>
          Enter a Solana token address to scan for token information
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
                </dl>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TokenScanner;
