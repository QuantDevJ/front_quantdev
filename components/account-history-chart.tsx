"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AccountHistoryData } from "@/lib/plaid-types";

type AccountHistoryChartProps = {
  data: AccountHistoryData | null;
  loading?: boolean;
  error?: string | null;
  onClose?: () => void;
};

type ChartDataPoint = {
  date: string;
  dateFormatted: string;
  balance: number;
  availableBalance: number | null;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  return (
    <div className="rounded-lg border bg-white p-3 shadow-lg">
      <p className="text-sm font-medium text-gray-900">{data.dateFormatted}</p>
      <div className="mt-1 space-y-1 text-sm">
        <p>
          <span className="text-gray-600">Balance: </span>
          <span className="font-medium">{formatCurrency(data.balance)}</span>
        </p>
        {data.availableBalance !== null && (
          <p>
            <span className="text-gray-600">Available: </span>
            <span className="font-medium">{formatCurrency(data.availableBalance)}</span>
          </p>
        )}
      </div>
    </div>
  );
}

export function AccountHistoryChart({
  data,
  loading,
  error,
  onClose,
}: AccountHistoryChartProps) {
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (!data?.snapshots) return [];

    // Sort by date ascending for the chart
    const sorted = [...data.snapshots].sort(
      (a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime()
    );

    return sorted.map((s) => ({
      date: s.snapshot_date,
      dateFormatted: formatFullDate(s.snapshot_date),
      balance: s.current_balance,
      availableBalance: s.available_balance,
    }));
  }, [data]);

  const { minValue, maxValue } = useMemo(() => {
    if (chartData.length === 0) {
      return { minValue: 0, maxValue: 100 };
    }
    const values = chartData.map((d) => d.balance);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1 || max * 0.1 || 10;

    return {
      minValue: Math.max(0, min - padding),
      maxValue: max + padding,
    };
  }, [chartData]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-sm text-gray-500">Loading history...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="py-8 text-center">
          <div className="text-sm text-red-700">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!data || chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Balance History</CardTitle>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <div className="text-sm text-gray-500">
            No balance history available yet. Check back after the next sync.
          </div>
        </CardContent>
      </Card>
    );
  }

  const latestSnapshot = chartData[chartData.length - 1];
  const firstSnapshot = chartData[0];
  const totalChange = latestSnapshot.balance - firstSnapshot.balance;
  const totalChangePct =
    firstSnapshot.balance !== 0
      ? ((latestSnapshot.balance - firstSnapshot.balance) / firstSnapshot.balance) * 100
      : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">
              {data.account_name || "Account"} Balance History
            </CardTitle>
            <CardDescription>
              {data.institution_name && <span>{data.institution_name} - </span>}
              {data.account_type && <span>{data.account_type}</span>}
            </CardDescription>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Current Balance</div>
            <div className="text-lg font-semibold">
              {formatCurrency(latestSnapshot.balance)}
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Starting Balance</div>
            <div className="text-lg font-semibold">
              {formatCurrency(firstSnapshot.balance)}
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Period Change</div>
            <div
              className={`text-lg font-semibold ${
                totalChange >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {totalChange >= 0 ? "+" : ""}
              {formatCurrency(totalChange)}
              <span className="ml-1 text-sm">
                ({totalChangePct >= 0 ? "+" : ""}{totalChangePct.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="#9ca3af"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <YAxis
                domain={[minValue, maxValue]}
                tickFormatter={(v) => formatCurrency(v)}
                stroke="#9ca3af"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="#10b981"
                strokeWidth={2}
                dot={chartData.length <= 30}
                activeDot={{ r: 6, fill: "#10b981" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Date Range */}
        <div className="mt-3 text-center text-xs text-gray-500">
          {data.earliest_date && data.latest_date && (
            <span>
              {formatFullDate(data.earliest_date)} — {formatFullDate(data.latest_date)}
            </span>
          )}
          <span className="ml-2">({chartData.length} data points)</span>
        </div>
      </CardContent>
    </Card>
  );
}
