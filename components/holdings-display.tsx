"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Pagination } from "@/components/pagination";
import { HoldingHistoryChart } from "@/components/holding-history-chart";
import { apiGet } from "@/lib/api-envelope";
import { getApiBaseUrl } from "@/lib/api-base";
import type {
  PlaidAccount,
  PlaidHolding,
  PlaidSecurity,
  HoldingHistoryData,
} from "@/lib/plaid-types";

const ITEMS_PER_PAGE = 10;

type HoldingsDisplayProps = {
  holdings: PlaidHolding[];
  securities: PlaidSecurity[];
  accounts: PlaidAccount[];
  loading?: boolean;
  error?: string | null;
  onUnauthorized?: () => void;
};

function formatCurrency(value: number | null, currency?: string | null): string {
  if (value === null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency ?? "USD",
  }).format(value);
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

type HoldingWithDetails = PlaidHolding & {
  security: PlaidSecurity | undefined;
  account: PlaidAccount | undefined;
  gainLoss: number | null;
  gainLossPercent: number | null;
};

export function HoldingsDisplay({
  holdings,
  securities,
  accounts,
  loading,
  error,
  onUnauthorized,
}: HoldingsDisplayProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedHoldingId, setSelectedHoldingId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<HoldingHistoryData | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const fetchHistory = useCallback(
    async (holdingId: string) => {
      const base = getApiBaseUrl();
      if (!base) return;

      setSelectedHoldingId(holdingId);
      setHistoryLoading(true);
      setHistoryError(null);

      try {
        const data = await apiGet<HoldingHistoryData>(
          `${base}/v1/plaid/holdings/${holdingId}/history`,
          onUnauthorized ?? (() => {}),
        );
        setHistoryData(data);
      } catch (e) {
        setHistoryError(
          e instanceof Error ? e.message : "Could not load history."
        );
        setHistoryData(null);
      } finally {
        setHistoryLoading(false);
      }
    },
    [onUnauthorized],
  );

  const closeHistory = useCallback(() => {
    setSelectedHoldingId(null);
    setHistoryData(null);
    setHistoryError(null);
  }, []);

  const securitiesMap = useMemo(() => {
    const map = new Map<string, PlaidSecurity>();
    for (const sec of securities) {
      map.set(sec.security_id, sec);
    }
    return map;
  }, [securities]);

  const accountsMap = useMemo(() => {
    const map = new Map<string, PlaidAccount>();
    for (const acc of accounts) {
      map.set(acc.account_id, acc);
    }
    return map;
  }, [accounts]);

  const holdingsWithDetails: HoldingWithDetails[] = useMemo(() => {
    return holdings.map((h) => {
      const security = securitiesMap.get(h.security_id);
      const account = accountsMap.get(h.account_id);
      let gainLoss: number | null = null;
      let gainLossPercent: number | null = null;

      if (h.institution_value !== null && h.cost_basis !== null && h.cost_basis !== 0) {
        gainLoss = h.institution_value - h.cost_basis;
        gainLossPercent = gainLoss / h.cost_basis;
      }

      return {
        ...h,
        security,
        account,
        gainLoss,
        gainLossPercent,
      };
    });
  }, [holdings, securitiesMap, accountsMap]);

  const totalPages = Math.ceil(holdingsWithDetails.length / ITEMS_PER_PAGE);
  const paginatedHoldings = holdingsWithDetails.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalValue = useMemo(() => {
    return holdings.reduce((sum, h) => sum + (h.institution_value ?? 0), 0);
  }, [holdings]);

  const totalCostBasis = useMemo(() => {
    return holdings.reduce((sum, h) => sum + (h.cost_basis ?? 0), 0);
  }, [holdings]);

  const totalGainLoss = totalValue - totalCostBasis;
  const totalGainLossPercent = totalCostBasis > 0 ? totalGainLoss / totalCostBasis : null;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-[#737373]">
          Loading holdings...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="py-8 text-center text-sm text-red-900">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (holdings.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Holdings</CardTitle>
          <CardDescription>Your investment positions</CardDescription>
        </CardHeader>
        <CardContent className="py-4 text-center text-sm text-[#737373]">
          No holdings found.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-2">
          <CardDescription className="text-blue-800">Total Holdings Value</CardDescription>
          <CardTitle className="text-3xl font-bold text-blue-950">
            {formatCurrency(totalValue)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-blue-800">Cost Basis: </span>
              <span className="font-medium text-blue-950">
                {formatCurrency(totalCostBasis)}
              </span>
            </div>
            {totalGainLossPercent !== null && (
              <div>
                <span className="text-blue-800">Total Return: </span>
                <span
                  className={`font-medium ${
                    totalGainLoss >= 0 ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {totalGainLoss >= 0 ? "+" : ""}
                  {formatCurrency(totalGainLoss)} ({formatPercent(totalGainLossPercent)})
                </span>
              </div>
            )}
          </div>
          <p className="mt-2 text-sm text-blue-800">
            {holdings.length} position{holdings.length !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Holdings</CardTitle>
          <CardDescription>
            {holdings.length} position{holdings.length !== 1 ? "s" : ""} across all accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[#737373]">
                  <th className="pb-2 pr-4 font-medium">Symbol</th>
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Account</th>
                  <th className="pb-2 pr-4 text-right font-medium">Shares</th>
                  <th className="pb-2 pr-4 text-right font-medium">Price</th>
                  <th className="pb-2 pr-4 text-right font-medium">Value</th>
                  <th className="pb-2 text-right font-medium">Gain/Loss</th>
                </tr>
              </thead>
              <tbody>
                {paginatedHoldings.map((h, idx) => (
                  <tr
                    key={`${h.account_id}-${h.security_id}-${idx}`}
                    className={`border-b last:border-0 ${
                      h.holding_id
                        ? "cursor-pointer hover:bg-blue-50 transition-colors"
                        : ""
                    } ${
                      selectedHoldingId === h.holding_id ? "bg-blue-100" : ""
                    }`}
                    onClick={() => {
                      if (h.holding_id) {
                        if (selectedHoldingId === h.holding_id) {
                          closeHistory();
                        } else {
                          fetchHistory(h.holding_id);
                        }
                      }
                    }}
                  >
                    <td className="py-3 pr-4 font-medium">
                      <span className="flex items-center gap-1">
                        {h.security?.ticker_symbol ?? "-"}
                        {h.holding_id && (
                          <svg
                            className="h-3 w-3 text-blue-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                            />
                          </svg>
                        )}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-[#454652] max-w-[200px] truncate">
                      {h.security?.name ?? "Unknown security"}
                    </td>
                    <td className="py-3 pr-4 text-[#737373]">
                      {h.account?.name ?? "-"}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {formatQuantity(h.quantity)}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {formatCurrency(h.institution_price, h.iso_currency_code)}
                    </td>
                    <td className="py-3 pr-4 text-right font-medium">
                      {formatCurrency(h.institution_value, h.iso_currency_code)}
                    </td>
                    <td className="py-3 text-right">
                      {h.gainLoss !== null && h.gainLossPercent !== null ? (
                        <span
                          className={`font-medium ${
                            h.gainLoss >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {h.gainLoss >= 0 ? "+" : ""}
                          {formatCurrency(h.gainLoss)}
                          <span className="ml-1 text-xs">
                            ({formatPercent(h.gainLossPercent)})
                          </span>
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={holdingsWithDetails.length}
            itemsPerPage={ITEMS_PER_PAGE}
          />

          <p className="mt-3 text-xs text-gray-500">
            Click on a holding to view its performance history
          </p>
        </CardContent>
      </Card>

      {/* Performance History Chart */}
      {(selectedHoldingId || historyLoading) && (
        <HoldingHistoryChart
          data={historyData}
          loading={historyLoading}
          error={historyError}
          onClose={closeHistory}
        />
      )}
    </div>
  );
}
