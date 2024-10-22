"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TokenData } from "@/components/token-scanner/types";

export const columns: ColumnDef<TokenData>[] = [
  {
    accessorKey: "timestamp",
    header: ({ column }) => {
      return (
        <div className="text-left">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Time
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    },
    cell: ({ row }) => (
      <div className="text-left">
        {new Date(row.getValue("timestamp")).toLocaleTimeString()}
      </div>
    ),
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
    cell: ({ row }) => (
      <div className="text-right">
        {row.getValue<number>("marketCap").toFixed(2)} SOL
      </div>
    ),
    filterFn: (row, id, value) => {
      const filterValue = Number(value);
      return filterValue === 0 || row.getValue<number>(id) >= filterValue;
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
          24h Volume
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right">
        {row.getValue<number>("volume24h").toFixed(2)} SOL
      </div>
    ),
    filterFn: (row, id, value) => {
      const filterValue = Number(value);
      return filterValue === 0 || row.getValue<number>(id) >= filterValue;
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
        <div className="flex justify-end">
          <a
            href={`https://pump.fun/${mint}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-accent rounded-full transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      );
    },
  },
];
