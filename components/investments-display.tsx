"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type {
  PlaidAccount,
  PlaidHolding,
  PlaidInvestmentsData,
  PlaidSecurity,
} from "@/lib/plaid-types";

type InvestmentsDisplayProps = {
  data: PlaidInvestmentsData;
  loading?: boolean;
  error?: string | null;
  syncing?: boolean;
  onSync?: () => void;
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

type HoldingWithSecurity = PlaidHolding & {
  security: PlaidSecurity | undefined;
};

export function InvestmentsDisplay({ data, loading, error, syncing, onSync }: InvestmentsDisplayProps) {
  const securitiesMap = useMemo(() => {
    const map = new Map<string, PlaidSecurity>();
    for (const sec of data.securities) {
      map.set(sec.security_id, sec);
    }
    return map;
  }, [data.securities]);

  const holdingsByAccount = useMemo(() => {
    const map = new Map<string, HoldingWithSecurity[]>();
    for (const h of data.holdings) {
      const holdings = map.get(h.account_id) ?? [];
      holdings.push({
        ...h,
        security: securitiesMap.get(h.security_id),
      });
      map.set(h.account_id, holdings);
    }
    return map;
  }, [data.holdings, securitiesMap]);

  const totalValue = useMemo(() => {
    return data.holdings.reduce((sum, h) => sum + (h.institution_value ?? 0), 0);
  }, [data.holdings]);

  if (loading) {
    return (
      <Card className="mt-6">
        <CardContent className="py-8 text-center text-sm text-[#737373]">
          Loading portfolio...
        </CardContent>
      </Card>
    );
  }

  // Check if sync failed
  if (data.status === "failed") {
    return (
      <Card className="mt-6 border-red-200 bg-red-50">
        <CardContent className="py-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-sm font-medium text-red-900">
              Sync failed
            </p>
            <p className="max-w-md text-xs text-red-700">
              {data.message || "An error occurred while syncing your investment data."}
            </p>
            {onSync && (
              <Button
                onClick={onSync}
                className="mt-2 bg-red-600 hover:bg-red-700"
                disabled={syncing}
              >
                {syncing ? "Retrying..." : "Retry Sync"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if data is still being synced from Plaid
  if (data.status === "loading" || data.status === "syncing" || data.status === "pending") {
    return (
      <Card className="mt-6 border-blue-200 bg-blue-50">
        <CardContent className="py-8 text-center">
          <div className="flex flex-col items-center gap-3">
            {syncing || data.status === "syncing" ? (
              <>
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                <p className="text-sm font-medium text-blue-900">
                  Syncing your investment data...
                </p>
              </>
            ) : data.status === "pending" ? (
              <>
                <div className="h-8 w-8 animate-pulse rounded-full bg-blue-300" />
                <p className="text-sm font-medium text-blue-900">
                  Sync queued...
                </p>
                <p className="text-xs text-blue-700">
                  Your data will be synced shortly.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-blue-900">
                  No investment data yet.
                </p>
                <p className="text-xs text-blue-700">
                  Click below to sync your portfolio from Plaid.
                </p>
                {onSync && (
                  <Button
                    onClick={onSync}
                    className="mt-2 bg-blue-600 hover:bg-blue-700"
                    disabled={syncing}
                  >
                    Sync Now
                  </Button>
                )}
              </>
            )}
          </div>
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

  if (data.accounts.length === 0) {
    return (
      <Card className="mt-6">
        <CardContent className="py-8 text-center text-sm text-[#737373]">
          No investment accounts found.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardDescription className="text-blue-800">Portfolio Summary</CardDescription>
              <CardTitle className="text-3xl font-bold text-blue-950">
                {formatCurrency(totalValue)}
              </CardTitle>
            </div>
            {onSync && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSync}
                disabled={syncing}
                className="border-blue-300 text-blue-800 hover:bg-blue-100"
              >
                {syncing ? "Syncing..." : "Refresh"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-blue-800">
            {data.accounts.length} account{data.accounts.length !== 1 ? "s" : ""} &middot;{" "}
            {data.holdings.length} holding{data.holdings.length !== 1 ? "s" : ""}
          </p>
          {data.last_sync_at && (
            <p className="mt-1 text-xs text-blue-600">
              Last synced: {new Date(data.last_sync_at).toLocaleString("en-US", { timeZone: "UTC", timeZoneName: "short" })}
            </p>
          )}
        </CardContent>
      </Card>

      {data.accounts.map((account: PlaidAccount) => {
        const holdings = holdingsByAccount.get(account.account_id) ?? [];
        const accountValue = holdings.reduce(
          (sum, h) => sum + (h.institution_value ?? 0),
          0
        );

        return (
          <Card key={account.account_id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{account.name}</CardTitle>
                  <CardDescription>
                    {account.subtype ?? account.type ?? "Investment account"}
                    {account.mask ? ` (...${account.mask})` : ""}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">
                    {formatCurrency(accountValue, account.balances.iso_currency_code)}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {holdings.length === 0 ? (
                <p className="text-sm text-[#737373]">No holdings in this account.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-[#737373]">
                        <th className="pb-2 pr-4 font-medium">Symbol</th>
                        <th className="pb-2 pr-4 font-medium">Name</th>
                        <th className="pb-2 pr-4 text-right font-medium">Shares</th>
                        <th className="pb-2 pr-4 text-right font-medium">Price</th>
                        <th className="pb-2 text-right font-medium">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {holdings.map((h) => (
                        <tr key={h.security_id} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">
                            {h.security?.ticker_symbol ?? "-"}
                          </td>
                          <td className="py-2 pr-4 text-[#454652]">
                            {h.security?.name ?? "Unknown security"}
                          </td>
                          <td className="py-2 pr-4 text-right">
                            {formatQuantity(h.quantity)}
                          </td>
                          <td className="py-2 pr-4 text-right">
                            {formatCurrency(h.institution_price, h.iso_currency_code)}
                          </td>
                          <td className="py-2 text-right font-medium">
                            {formatCurrency(h.institution_value, h.iso_currency_code)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
