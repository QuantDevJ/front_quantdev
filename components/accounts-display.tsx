"use client";

import { useCallback, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AccountHistoryChart } from "@/components/account-history-chart";
import { apiGet } from "@/lib/api-envelope";
import { getApiBaseUrl } from "@/lib/api-base";
import type { PlaidAccount, AccountHistoryData } from "@/lib/plaid-types";

type AccountsDisplayProps = {
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

function getAccountTypeLabel(type: string | null, subtype: string | null): string {
  if (subtype) {
    return subtype.charAt(0).toUpperCase() + subtype.slice(1).replace(/_/g, " ");
  }
  if (type) {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }
  return "Investment";
}

function getAccountTypeColor(type: string | null): string {
  switch (type?.toLowerCase()) {
    case "investment":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "brokerage":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "depository":
      return "bg-green-50 text-green-700 border-green-200";
    case "credit":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
}

export function AccountsDisplay({ accounts, loading, error, onUnauthorized }: AccountsDisplayProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<AccountHistoryData | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const fetchHistory = useCallback(
    async (accountId: string) => {
      const base = getApiBaseUrl();
      if (!base) return;

      setSelectedAccountId(accountId);
      setHistoryLoading(true);
      setHistoryError(null);

      try {
        const data = await apiGet<AccountHistoryData>(
          `${base}/v1/plaid/accounts/${accountId}/history`,
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
    setSelectedAccountId(null);
    setHistoryData(null);
    setHistoryError(null);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-[#737373]">
          Loading accounts...
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

  if (accounts.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Accounts</CardTitle>
          <CardDescription>Your linked investment accounts</CardDescription>
        </CardHeader>
        <CardContent className="py-4 text-center text-sm text-[#737373]">
          No accounts found.
        </CardContent>
      </Card>
    );
  }

  const totalBalance = accounts.reduce(
    (sum, acc) => sum + (acc.balances.current ?? 0),
    0
  );

  return (
    <div className="space-y-4">
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-2">
          <CardDescription className="text-blue-800">Total Balance</CardDescription>
          <CardTitle className="text-3xl font-bold text-blue-950">
            {formatCurrency(totalBalance)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-blue-800">
            {accounts.length} account{accounts.length !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Accounts</CardTitle>
          <CardDescription>
            {accounts.length} linked account{accounts.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="divide-y">
            {accounts.map((account) => (
              <div
                key={account.account_id}
                className={`flex items-center justify-between py-4 first:pt-0 last:pb-0 cursor-pointer hover:bg-blue-50 transition-colors rounded-lg px-2 -mx-2 ${
                  selectedAccountId === account.account_id ? "bg-blue-100" : ""
                }`}
                onClick={() => {
                  if (selectedAccountId === account.account_id) {
                    closeHistory();
                  } else {
                    fetchHistory(account.account_id);
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg border ${getAccountTypeColor(account.type)}`}
                  >
                    <span className="text-sm font-bold">
                      {(account.name || "A").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-[#1C1B1B] flex items-center gap-1">
                      {account.name}
                      {account.mask && (
                        <span className="ml-2 text-sm text-[#737373]">
                          (...{account.mask})
                        </span>
                      )}
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
                    </div>
                    <div className="text-sm text-[#737373]">
                      {getAccountTypeLabel(account.type, account.subtype)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-[#1C1B1B]">
                    {formatCurrency(account.balances.current, account.balances.iso_currency_code)}
                  </div>
                  {account.balances.available !== null &&
                    account.balances.available !== account.balances.current && (
                      <div className="text-sm text-[#737373]">
                        {formatCurrency(account.balances.available, account.balances.iso_currency_code)} available
                      </div>
                    )}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Click on an account to view its balance history
          </p>
        </CardContent>
      </Card>

      {/* Balance History Chart */}
      {(selectedAccountId || historyLoading) && (
        <AccountHistoryChart
          data={historyData}
          loading={historyLoading}
          error={historyError}
          onClose={closeHistory}
        />
      )}
    </div>
  );
}
