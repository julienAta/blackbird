"use client";

import { Cross2Icon } from "@radix-ui/react-icons";
import { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Filter tokens..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        <Select
          value={
            (table.getColumn("marketCap")?.getFilterValue() as string) ?? "0"
          }
          onValueChange={(value) =>
            table.getColumn("marketCap")?.setFilterValue(value)
          }
        >
          <SelectTrigger className="h-8 w-[150px]">
            <SelectValue placeholder="Market Cap" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">All Market Caps</SelectItem>
            <SelectItem value="10">Above 10 SOL</SelectItem>
            <SelectItem value="50">Above 50 SOL</SelectItem>
            <SelectItem value="100">Above 100 SOL</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={
            (table.getColumn("volume24h")?.getFilterValue() as string) ?? "0"
          }
          onValueChange={(value) =>
            table.getColumn("volume24h")?.setFilterValue(value)
          }
        >
          <SelectTrigger className="h-8 w-[150px]">
            <SelectValue placeholder="24h Volume" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">All Volume</SelectItem>
            <SelectItem value="1">Above 1 SOL</SelectItem>
            <SelectItem value="5">Above 5 SOL</SelectItem>
            <SelectItem value="10">Above 10 SOL</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={
            (table.getColumn("holders")?.getFilterValue() as string) ?? "0"
          }
          onValueChange={(value) =>
            table.getColumn("holders")?.setFilterValue(value)
          }
        >
          <SelectTrigger className="h-8 w-[150px]">
            <SelectValue placeholder="Holders" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">All Holders</SelectItem>
            <SelectItem value="10">Above 10</SelectItem>
            <SelectItem value="50">Above 50</SelectItem>
            <SelectItem value="100">Above 100</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={
            (table.getColumn("initialBuySol")?.getFilterValue() as string) ??
            "0"
          }
          onValueChange={(value) =>
            table.getColumn("initialBuySol")?.setFilterValue(value)
          }
        >
          <SelectTrigger className="h-8 w-[150px]">
            <SelectValue placeholder="Initial Buy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">All Initial Buys</SelectItem>
            <SelectItem value="0.1">Above 0.1 SOL</SelectItem>
            <SelectItem value="0.5">Above 0.5 SOL</SelectItem>
            <SelectItem value="1">Above 1 SOL</SelectItem>
          </SelectContent>
        </Select>
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
