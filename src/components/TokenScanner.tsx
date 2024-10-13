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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTokenMetadata, getInitialTransactions } from "@/lib/solana";

const TokenScanner = () => {
  const [tokenAddress, setTokenAddress] = useState(
    "JBSVUpKgYNHt4GLtNebQxTJmZgftTMWENQrziHtGpump"
  );
  const [tokenMetadata, setTokenMetadata] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleScan = async () => {
    setIsLoading(true);
    setError("");
    try {
      const metadata = await getTokenMetadata(tokenAddress);
      setTokenMetadata(metadata);
      const txs = await getInitialTransactions(tokenAddress);
      setTransactions(txs);
    } catch (err) {
      setError("Failed to scan token. Please check the address and try again.");
      setTokenMetadata(null);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Token Scanner</CardTitle>
        <CardDescription>Enter a Solana token address to scan</CardDescription>
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
          {tokenMetadata && (
            <div className="mt-4">
              <h3 className="font-semibold">Token Information:</h3>
              <dl className="mt-2 space-y-1">
                <div>
                  <dt className="inline font-semibold">Name:</dt>
                  <dd className="inline ml-1">{tokenMetadata.name}</dd>
                </div>
                <div>
                  <dt className="inline font-semibold">Symbol:</dt>
                  <dd className="inline ml-1">{tokenMetadata.symbol}</dd>
                </div>
                <div>
                  <dt className="inline font-semibold">Address:</dt>
                  <dd className="inline ml-1">{tokenMetadata.address}</dd>
                </div>
              </dl>
            </div>
          )}
          {transactions.length > 0 && (
            <div className="mt-8">
              <h3 className="font-semibold mb-4">Initial Transactions:</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Signature</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {new Date(tx.blockTime * 1000).toLocaleString()}
                      </TableCell>
                      <TableCell>{tx.signature.slice(0, 20)}...</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TokenScanner;
