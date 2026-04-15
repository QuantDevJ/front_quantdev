"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Pagination } from "@/components/pagination";
import { apiGet } from "@/lib/api-envelope";
import { getApiBaseUrl } from "@/lib/api-base";
import { ApiError } from "@/lib/api-error";
import type { PlaidTransaction } from "@/lib/plaid-types";

const ITEMS_PER_PAGE = 50;

type TransactionsResponse = {
  transactions: PlaidTransaction[];
  total_count: number;
  page: number;
  limit: number;
  total_pages: number;
};

type TransactionsDisplayProps = {
  onUnauthorized: () => void;
};

function formatCurrency(value: number | null): string {
  if (value === null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatQuantity(value: number | null): string {
  if (value === null) return "-";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(Math.abs(value));
}

function getTypeColor(type: string | null): string {
  switch (type) {
    case "buy":
      return "text-green-700 bg-green-50";
    case "sell":
      return "text-red-700 bg-red-50";
    case "dividend":
      return "text-blue-700 bg-blue-50";
    case "interest":
      return "text-purple-700 bg-purple-50";
    case "fee":
      return "text-orange-700 bg-orange-50";
    case "transfer_in":
      return "text-teal-700 bg-teal-50";
    case "transfer_out":
      return "text-amber-700 bg-amber-50";
    default:
      return "text-gray-700 bg-gray-50";
  }
}

function formatType(type: string | null): string {
  if (!type) return "Other";
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TransactionsDisplay({ onUnauthorized }: TransactionsDisplayProps) {
  const [transactions, setTransactions] = useState<PlaidTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const fetchTransactions = useCallback(
    async (page: number) => {
      const base = getApiBaseUrl();
      if (!base) return;

      setLoading(true);
      setError(null);

      try {
        // Backend uses 0-indexed pages, UI uses 1-indexed
        const data = await apiGet<TransactionsResponse>(
          `${base}/v1/plaid/transactions?page=${page - 1}&limit=${ITEMS_PER_PAGE}`,
          onUnauthorized
        );
        setTransactions(data.transactions);
        setTotalCount(data.total_count);
        setTotalPages(data.total_pages);
        setCurrentPage(page);
      } catch (e) {
        setError(
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Could not load transactions."
        );
      } finally {
        setLoading(false);
      }
    },
    [onUnauthorized]
  );

  useEffect(() => {
    fetchTransactions(1);
  }, [fetchTransactions]);

  const handlePageChange = (page: number) => {
    fetchTransactions(page);
  };

  if (loading && transactions.length === 0) {
    return (
      <Card className="mt-6">
        <CardContent className="py-8 text-center text-sm text-[#737373]">
          Loading transactions...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mt-6 border-red-200">
        <CardContent className="py-8 text-center text-sm text-red-900">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (totalCount === 0) {
    return (
      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
          <CardDescription>Your investment activity</CardDescription>
        </CardHeader>
        <CardContent className="py-4 text-center text-sm text-[#737373]">
          No transactions found.
        </CardContent>
      </Card>
    );
  }

  // Calculate display range (1-indexed for display)
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalCount);

  return (
    <Card className="mt-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Recent Transactions</CardTitle>
        <CardDescription>
          {totalCount} transaction{totalCount !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-[#737373]">
                <th className="pb-2 pr-4 font-medium">Date</th>
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 pr-4 font-medium">Symbol</th>
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 text-right font-medium">Qty</th>
                <th className="pb-2 pr-4 text-right font-medium">Price</th>
                <th className="pb-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="py-2 pr-4 text-[#454652]">
                    {formatDate(t.date)}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${getTypeColor(t.type)}`}
                    >
                      {formatType(t.type)}
                    </span>
                  </td>
                  <td className="py-2 pr-4 font-medium">
                    {t.ticker ?? "-"}
                  </td>
                  <td className="py-2 pr-4 text-[#454652] max-w-[200px] truncate">
                    {t.security_name ?? "-"}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {formatQuantity(t.quantity)}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {formatCurrency(t.price)}
                  </td>
                  <td className={`py-2 text-right font-medium ${
                    t.amount && t.amount < 0 ? "text-red-600" : "text-green-600"
                  }`}>
                    {formatCurrency(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4 pt-4 border-t">
            <p className="text-sm text-[#737373]">
              Showing {startItem}-{endItem} of {totalCount} transactions
            </p>
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
