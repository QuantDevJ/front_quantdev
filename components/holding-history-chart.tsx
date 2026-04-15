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
  ReferenceLine,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { HoldingHistoryData, PerformanceSnapshot } from "@/lib/plaid-types";

type HoldingHistoryChartProps = {
  data: HoldingHistoryData | null;
  loading?: boolean;
  error?: string | null;
  onClose?: () => void;
};

type ChartDataPoint = {
  date: string;
  dateFormatted: string;
  value: number;
  costBasis: number | null;
  gain: number | null;
  gainPct: number | null;
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
          <span className="text-gray-600">Value: </span>
          <span className="font-medium">{formatCurrency(data.value)}</span>
        </p>
        {data.costBasis !== null && (
          <p>
            <span className="text-gray-600">Cost Basis: </span>
            <span className="font-medium">{formatCurrency(data.costBasis)}</span>
          </p>
        )}
        {data.gain !== null && (
          <p>
            <span className="text-gray-600">Gain/Loss: </span>
            <span
              className={`font-medium ${
                data.gain >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {data.gain >= 0 ? "+" : ""}
              {formatCurrency(data.gain)}
              {data.gainPct !== null && (
                <span className="ml-1">({data.gainPct.toFixed(2)}%)</span>
              )}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

export function HoldingHistoryChart({
  data,
  loading,
  error,
  onClose,
}: HoldingHistoryChartProps) {
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (!data?.snapshots) return [];

    // Sort by date ascending for the chart
    const sorted = [...data.snapshots].sort(
      (a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime()
    );

    return sorted.map((s) => ({
      date: s.snapshot_date,
      dateFormatted: formatFullDate(s.snapshot_date),
      value: s.value,
      costBasis: s.cost_basis_total,
      gain: s.unrealized_gain,
      gainPct: s.unrealized_gain_pct,
    }));
  }, [data?.snapshots]);

  const { minValue, maxValue, avgCostBasis } = useMemo(() => {
    if (chartData.length === 0) {
      return { minValue: 0, maxValue: 100, avgCostBasis: null };
    }
    const values = chartData.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1 || max * 0.1 || 10;

    // Calculate average cost basis for reference line
    const costBases = chartData
      .map((d) => d.costBasis)
      .filter((v): v is number => v !== null);
    const avg =
      costBases.length > 0
        ? costBases.reduce((a, b) => a + b, 0) / costBases.length
        : null;

    return {
      minValue: Math.max(0, min - padding),
      maxValue: max + padding,
      avgCostBasis: avg,
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
            <CardTitle className="text-lg">Performance History</CardTitle>
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
            No performance history available yet. Check back after the next sync.
          </div>
        </CardContent>
      </Card>
    );
  }

  const latestSnapshot = chartData[chartData.length - 1];
  const firstSnapshot = chartData[0];
  const totalChange = latestSnapshot.value - firstSnapshot.value;
  const totalChangePct =
    firstSnapshot.value !== 0
      ? ((latestSnapshot.value - firstSnapshot.value) / firstSnapshot.value) * 100
      : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">
              {data.ticker ? `${data.ticker} - ` : ""}
              {data.security_name}
            </CardTitle>
            <CardDescription>
              {data.account_name && <span>{data.account_name} - </span>}
              Performance over time
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
        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Current Value</div>
            <div className="text-lg font-semibold">
              {formatCurrency(latestSnapshot.value)}
            </div>
          </div>
          {latestSnapshot.costBasis !== null && (
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Cost Basis</div>
              <div className="text-lg font-semibold">
                {formatCurrency(latestSnapshot.costBasis)}
              </div>
            </div>
          )}
          {latestSnapshot.gain !== null && (
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Unrealized Gain</div>
              <div
                className={`text-lg font-semibold ${
                  latestSnapshot.gain >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {latestSnapshot.gain >= 0 ? "+" : ""}
                {formatCurrency(latestSnapshot.gain)}
              </div>
            </div>
          )}
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Period Change</div>
            <div
              className={`text-lg font-semibold ${
                totalChange >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {totalChange >= 0 ? "+" : ""}
              {totalChangePct.toFixed(2)}%
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
              {avgCostBasis !== null && (
                <ReferenceLine
                  y={avgCostBasis}
                  stroke="#9ca3af"
                  strokeDasharray="5 5"
                  label={{
                    value: "Cost Basis",
                    position: "right",
                    fill: "#9ca3af",
                    fontSize: 11,
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={chartData.length <= 30}
                activeDot={{ r: 6, fill: "#3b82f6" }}
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
