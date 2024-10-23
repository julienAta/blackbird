// components/virtual-table.tsx
"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TokenData } from "./token-scanner/types";
import { ArrowUpDown, ExternalLink } from "lucide-react";

interface VirtualTableProps {
  data: TokenData[];
  onSelect: (token: TokenData) => void;
}

export function VirtualTable({ data, onSelect }: VirtualTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 5,
  });

  const items = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  if (!isMounted) {
    // SSR fallback - show first few items
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Age</TableHead>
              <TableHead>Token</TableHead>
              <TableHead className="text-right">Market Cap</TableHead>
              <TableHead className="text-right">Volume</TableHead>
              <TableHead className="text-right">Holders</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, 10).map((token) => (
              <TableRow key={token.mint}>
                <TableCell>
                  {formatTimeAgo(Date.now() - token.timestamp)}
                </TableCell>
                <TableCell>
                  <div
                    className="flex items-center gap-2 cursor-pointer hover:text-primary"
                    onClick={() => onSelect(token)}
                  >
                    <span className="font-medium">{token.name}</span>
                    <Badge variant="outline">{token.symbol}</Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(token.marketCap)} SOL
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(token.volume24h)} SOL
                </TableCell>
                <TableCell className="text-right">
                  {token.holders.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <a
                    href={`https://pump.fun/${token.mint}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center p-2 hover:bg-accent rounded-full transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            <TableHead>Age</TableHead>
            <TableHead>
              <Button variant="ghost">
                Token
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead className="text-right">Market Cap</TableHead>
            <TableHead className="text-right">Volume</TableHead>
            <TableHead className="text-right">Holders</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((virtualRow) => {
            const token = data[virtualRow.index];
            return (
              <TableRow
                key={token.mint}
                data-index={virtualRow.index}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  position: virtualRow.index === 0 ? "relative" : "absolute",
                  width: "100%",
                  left: 0,
                }}
              >
                <TableCell>
                  {formatTimeAgo(Date.now() - token.timestamp)}
                </TableCell>
                <TableCell>
                  <div
                    className="flex items-center gap-2 cursor-pointer hover:text-primary"
                    onClick={() => onSelect(token)}
                  >
                    <span className="font-medium">{token.name}</span>
                    <Badge variant="outline">{token.symbol}</Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(token.marketCap)} SOL
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(token.volume24h)} SOL
                </TableCell>
                <TableCell className="text-right">
                  {token.holders.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <a
                    href={`https://pump.fun/${token.mint}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center p-2 hover:bg-accent rounded-full transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </TableCell>
              </TableRow>
            );
          })}
          <TableRow>
            <TableCell style={{ height: `${totalSize}px` }} />
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

// Utility functions
const formatTimeAgo = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
};

const formatNumber = (value: number) => {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
