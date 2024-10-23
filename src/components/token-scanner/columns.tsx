"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TokenData } from "@/components/token-scanner/types";
import { fetchSolPrice } from "@/app/actions/token";
import { useQuery } from "@tanstack/react-query";
export const columns: ColumnDef<TokenData>[] = [
  // In columns.tsx, update the timestamp column:
  {
    accessorKey: "timestamp",
    header: "Age",
    cell: ({ row }) => {
      const ageInSeconds = Math.floor(
        (Date.now() - row.getValue("timestamp")) / 1000
      );
      if (ageInSeconds < 60) {
        return `${ageInSeconds}s ago`;
      }
      const ageInMinutes = Math.floor(ageInSeconds / 60);
      if (ageInMinutes < 60) {
        return `${ageInMinutes}m ago`;
      }
      const ageInHours = Math.floor(ageInMinutes / 60);
      return `${ageInHours}h ago`;
    },
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <div className="text-left">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Token
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    },
    cell: ({ row }) => (
      <div
        className="flex items-center gap-2 text-left cursor-pointer hover:text-primary"
        onClick={() => row.original.onSelect?.(row.original)}
      >
        <span className="font-medium">{row.getValue("name")}</span>
        <Badge variant="outline">{row.original.symbol}</Badge>
      </div>
    ),
  },
  {
    accessorKey: "marketCap",
    header: ({ column }) => (
      <div className="text-right">
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="whitespace-nowrap"
        >
          Market Cap
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      </div>
    ),
    cell: ({ row }) => {
      // Use hook inside cell component
      const { data: solPrice = 0 } = useQuery({
        queryKey: ["solPrice"],
        queryFn: fetchSolPrice,
      });

      const marketCapSol = row.getValue<number>("marketCap");
      const marketCapUsd = marketCapSol * solPrice;

      return (
        <div className="text-right">
          <div>
            $
            {marketCapUsd.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="text-xs text-muted-foreground">
            {marketCapSol.toFixed(2)} SOL
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "volume24h",
    header: ({ column }) => (
      <div className="text-right">
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="whitespace-nowrap"
        >
          Volume
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      </div>
    ),
    cell: ({ row }) => {
      const { data: solPrice = 0 } = useQuery({
        queryKey: ["solPrice"],
        queryFn: fetchSolPrice,
      });

      const volumeSol = row.getValue<number>("volume24h");
      const volumeUsd = volumeSol * solPrice;

      return (
        <div className="text-right">
          <div>
            ${volumeUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted-foreground">
            {volumeSol.toFixed(2)} SOL
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "holders",
    header: ({ column }) => (
      <div className="text-right">
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Holders
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right">
        {row.getValue<number>("holders").toLocaleString()}
      </div>
    ),
    filterFn: (row, id, value) => {
      const filterValue = Number(value);
      return filterValue === 0 || row.getValue<number>(id) >= filterValue;
    },
  },
  {
    accessorKey: "liquidity",
    header: ({ column }) => (
      <div className="text-right">
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="whitespace-nowrap"
        >
          Liquidity
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right">
        {row.getValue<number>("liquidity").toFixed(2)} SOL
      </div>
    ),
  },
  {
    accessorKey: "initialBuySol",
    header: ({ column }) => (
      <div className="text-right">
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="whitespace-nowrap"
        >
          Initial Buy (SOL)
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right">
        {row.getValue<number>("initialBuySol").toFixed(2)} SOL
      </div>
    ),
    filterFn: (row, id, value) => {
      const filterValue = Number(value);
      return filterValue === 0 || row.getValue<number>(id) >= filterValue;
    },
  },
  {
    accessorKey: "initialBuyPercent",
    header: ({ column }) => (
      <div className="text-right">
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="whitespace-nowrap"
        >
          Initial Buy %
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right">
        {row.getValue<number>("initialBuyPercent").toFixed(2)}%
      </div>
    ),
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => {
      const mint = row.original.mint;
      return (
        <div className="flex">
          <div className="flex justify-end">
            <a
              href={`https://pump.fun/${mint}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-accent rounded-full transition-colors"
            >
              P
            </a>
          </div>
          <div className="flex justify-end">
            <a
              href={`https://gmgn.ai/sol/token/${mint}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-accent rounded-full transition-colors"
            >
              G
            </a>
          </div>
        </div>
      );
    },
  },
];
