export type PlaidAccountBalances = {
  current: number | null;
  available: number | null;
  iso_currency_code: string | null;
};

export type PlaidAccount = {
  account_id: string;
  name: string;
  type: string | null;
  subtype: string | null;
  mask: string | null;
  balances: PlaidAccountBalances;
};

export type PlaidHolding = {
  holding_id?: string;
  account_id: string;
  security_id: string;
  quantity: number;
  institution_price: number | null;
  institution_value: number | null;
  cost_basis: number | null;
  iso_currency_code: string | null;
};

export type PlaidSecurity = {
  security_id: string;
  name: string | null;
  ticker_symbol: string | null;
  type: string | null;
  close_price: number | null;
  close_price_as_of: string | null;
  iso_currency_code: string | null;
};

export type PlaidInvestmentsData = {
  status: "ready" | "loading" | "syncing" | "pending" | "failed";
  message?: string;
  accounts: PlaidAccount[];
  holdings: PlaidHolding[];
  securities: PlaidSecurity[];
  last_sync_at: string | null;
};

export type PlaidTransaction = {
  id: string;
  account_id: string;
  account_name: string | null;
  ticker: string | null;
  security_name: string | null;
  type: string | null;
  quantity: number | null;
  price: number | null;
  amount: number | null;
  date: string | null;
  settlement_date: string | null;
};

export type PlaidTransactionsData = {
  transactions: PlaidTransaction[];
};

export type PerformanceSnapshot = {
  id: string;
  snapshot_date: string;
  value: number;
  cost_basis_total: number | null;
  unrealized_gain: number | null;
  unrealized_gain_pct: number | null;
};

export type HoldingHistoryData = {
  holding_id: string;
  ticker: string | null;
  security_name: string;
  account_name: string | null;
  snapshots: PerformanceSnapshot[];
  earliest_date: string | null;
  latest_date: string | null;
};

export type AccountSnapshot = {
  id: string;
  snapshot_date: string;
  current_balance: number;
  available_balance: number | null;
  currency: string;
};

export type AccountHistoryData = {
  account_id: string;
  account_name: string | null;
  institution_name: string | null;
  account_type: string | null;
  snapshots: AccountSnapshot[];
  earliest_date: string | null;
  latest_date: string | null;
};

export type TimelineDataPoint = {
  date: string;
  total_balance: number;
  account_count: number;
};

export type AccountSummary = {
  id: string;
  name: string | null;
  institution_name: string | null;
  type: string | null;
  current_balance: number | null;
};

export type AggregatedAccountHistoryData = {
  timeline: TimelineDataPoint[];
  accounts: AccountSummary[];
  earliest_date: string | null;
  latest_date: string | null;
  total_accounts: number;
};
