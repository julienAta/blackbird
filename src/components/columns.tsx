import { ColumnDef } from "@tanstack/react-table";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TokenData } from "@/lib/types";

export const columns: ColumnDef<TokenData>[] = [
  {
    accessorKey: "timestamp",
    header: "Time",
    cell: ({ row }) => {
      return new Date(row.getValue("timestamp")).toLocaleTimeString();
    },
  },
  {
    accessorKey: "name",
    header: "Token",
    cell: ({ row }) => {
      const symbol = row.original.symbol;
      return (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.getValue("name")}</span>
          <Badge variant="outline">{symbol}</Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "mint",
    header: "Contract",
    cell: ({ row }) => {
      const mint = row.getValue("mint") as string;
      return (
        <div className="font-mono text-sm">
          {mint.slice(0, 8)}...{mint.slice(-8)}
        </div>
      );
    },
  },
  {
    accessorKey: "creator",
    header: "Creator",
    cell: ({ row }) => {
      const creator = row.getValue("creator") as string;
      return (
        <div className="font-mono text-sm">
          {creator.slice(0, 8)}...{creator.slice(-4)}
        </div>
      );
    },
  },
  {
    accessorKey: "initialBuy",
    header: "Initial Buy",
    cell: ({ row }) => {
      return (
        <div className="text-right">
          {row.getValue("initialBuy").toLocaleString()}
        </div>
      );
    },
  },
  {
    accessorKey: "marketCap",
    header: "Market Cap",
    cell: ({ row }) => {
      return (
        <div className="text-right">
          {Number(row.getValue("marketCap")).toFixed(2)} SOL
        </div>
      );
    },
  },
  {
    id: "actions",
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
