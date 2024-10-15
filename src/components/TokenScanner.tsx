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
import { getTokenInfo, getTokenAccounts } from "@/lib/solana";

const TokenScanner = () => {
  const [tokenAddress, setTokenAddress] = useState(
    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" // Example Solana token address (BONK)
  );
  const [tokenInfo, setTokenInfo] = useState(null);
  const [tokenAccounts, setTokenAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
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

  const handleFetchAccounts = async () => {
    setIsLoadingAccounts(true);
    setError("");
    try {
      const accounts = await getTokenAccounts(tokenAddress, 1000);
      setTokenAccounts(accounts);
      if (accounts.length === 0) {
        setError("No token accounts found.");
      }
    } catch (err) {
      setError(`Failed to fetch token accounts: ${err.message}`);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const totalSupply = tokenAccounts.reduce(
    (sum, account) => sum + account.amount,
    0
  );

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Solana Token Scanner</CardTitle>
        <CardDescription>
          Enter a Solana token address to scan for token information and
          accounts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Input
            type="text"
            placeholder="Solana Token Address"
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
                onClick={handleFetchAccounts}
                disabled={isLoadingAccounts}
                className="mt-4"
              >
                {isLoadingAccounts
                  ? "Fetching Accounts..."
                  : "Fetch Token Accounts"}
              </Button>
              {tokenAccounts.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold">Token Accounts:</h3>
                  <p>Displaying {tokenAccounts.length} accounts</p>
                  <p>Total supply: {totalSupply.toLocaleString()} tokens</p>
                  <div className="mt-2 max-h-60 overflow-y-auto">
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className="text-left">Owner</th>
                          <th className="text-right">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tokenAccounts.map((account, index) => (
                          <tr key={index}>
                            <td className="font-medium">{account.owner}</td>
                            <td className="text-right">
                              {account.amount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
