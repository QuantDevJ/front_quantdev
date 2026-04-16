"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiError } from "@/lib/api-error";
import { apiDelete, apiGet, apiPost } from "@/lib/api-envelope";
import { getApiBaseUrl } from "@/lib/api-base";
import { DashboardTabs, type DashboardTab } from "@/components/dashboard-tabs";
import { InvestmentsDisplay } from "@/components/investments-display";
import { AccountsDisplay } from "@/components/accounts-display";
import { HoldingsDisplay } from "@/components/holdings-display";
import { TransactionsDisplay } from "@/components/transactions-display";
import type { PlaidInvestmentsData } from "@/lib/plaid-types";
import {
  clearAuthCache,
  getAccessToken,
} from "@/lib/auth-session";
import { openPlaidLink, type PlaidOnSuccessMetadata } from "@/lib/plaid-link";

type PlaidConnection = {
  id: string;
  institution_name: string | null;
  institution_id: string | null;
  status: string;
  created_at: string | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const [loadState, setLoadState] = useState<"loading" | "ready">("loading");
  const [configError, setConfigError] = useState<string | null>(null);
  const [connections, setConnections] = useState<PlaidConnection[]>([]);
  const [busy, setBusy] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [investments, setInvestments] = useState<PlaidInvestmentsData | null>(null);
  const [investmentsLoading, setInvestmentsLoading] = useState(false);
  const [investmentsError, setInvestmentsError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>("dashboard");

  const onUnauthorized = useCallback(() => {
    clearAuthCache();
    router.replace("/login");
  }, [router]);

  const logout = useCallback(() => {
    clearAuthCache();
    router.replace("/login");
  }, [router]);

  const loadConnections = useCallback(async () => {
    const base = getApiBaseUrl();
    if (!base) return;
    const data = await apiGet<{ connections: PlaidConnection[] }>(
      `${base}/v1/plaid/connections`,
      onUnauthorized,
    );
    setConnections(data.connections);
  }, [onUnauthorized]);

  const pollCountRef = useRef(0);
  const maxPollAttempts = 15; // Stop polling after 30 seconds (15 * 2s)

  const fetchInvestments = useCallback(
    async (connectionId: string, isPolling = false) => {
      const base = getApiBaseUrl();
      if (!base) return;

      if (!isPolling) {
        setInvestmentsLoading(true);
        pollCountRef.current = 0;
      }
      setInvestmentsError(null);

      try {
        const data = await apiGet<PlaidInvestmentsData>(
          `${base}/v1/plaid/connections/${connectionId}/portfolio`,
          onUnauthorized,
        );

        setInvestments(data);

        // If still syncing/pending and haven't exceeded max attempts, poll again
        // "failed" status will stop polling and show error with retry button
        if (data.status === "loading" || data.status === "syncing" || data.status === "pending") {
          pollCountRef.current += 1;
          if (pollCountRef.current < maxPollAttempts) {
            setTimeout(() => fetchInvestments(connectionId, true), 2000);
          } else {
            // Stop polling, show timeout message
            setInvestmentsError("Sync is taking longer than expected. Please try refreshing the page.");
          }
        }
        // "failed" status is handled by InvestmentsDisplay with retry button
        // "ready" status means data is available
      } catch (e) {
        setInvestmentsError(
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Could not load investments.",
        );
        setInvestments(null);
      } finally {
        if (!isPolling) {
          setInvestmentsLoading(false);
        }
      }
    },
    [onUnauthorized],
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const base = getApiBaseUrl();
      if (!base) {
        if (!cancelled) {
          setConfigError(
            "Missing NEXT_PUBLIC_API_URL. Add it to .env.local and restart the dev server.",
          );
          setLoadState("ready");
        }
        return;
      }

      if (!getAccessToken()) {
        router.replace("/login");
        return;
      }

      try {
        await apiGet<{ user_id: string; is_active: boolean }>(
          `${base}/v1/auth/me`,
          onUnauthorized,
        );
        if (cancelled) return;

        const conn = await apiGet<{ connections: PlaidConnection[] }>(
          `${base}/v1/plaid/connections`,
          onUnauthorized,
        );
        if (!cancelled) setConnections(conn.connections);
      } catch {
        if (!cancelled) {
          clearAuthCache();
          router.replace("/login");
        }
      } finally {
        if (!cancelled) setLoadState("ready");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, onUnauthorized]);

  useEffect(() => {
    const active = connections.find((c) => c.status === "active");
    if (active && loadState === "ready") {
      fetchInvestments(active.id, false);
    } else if (!active) {
      setInvestments(null);
      setInvestmentsError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connections, loadState]);

  const syncInvestments = useCallback(
    async (connectionId: string) => {
      const base = getApiBaseUrl();
      if (!base) return;

      setSyncing(true);
      setInvestmentsError(null);
      try {
        await apiPost(`${base}/v1/plaid/connections/${connectionId}/sync`, {}, onUnauthorized);
        // After sync, fetch the updated data
        await fetchInvestments(connectionId, false);
      } catch (e) {
        setInvestmentsError(
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Could not sync investments.",
        );
      } finally {
        setSyncing(false);
      }
    },
    [onUnauthorized, fetchInvestments],
  );

  const connectPlaid = useCallback(async () => {
    setNotice(null);
    const base = getApiBaseUrl();
    if (!base) {
      setNotice({
        kind: "error",
        text: "Missing NEXT_PUBLIC_API_URL. Add it to .env.local and restart the dev server.",
      });
      return;
    }

    setBusy(true);
    try {
      const { link_token: linkToken } = await apiPost<{ link_token: string }>(
        `${base}/v1/plaid/link-token`,
        {},
        onUnauthorized,
      );

      await openPlaidLink({
        linkToken,
        onSuccess: async (publicToken: string, metadata: PlaidOnSuccessMetadata) => {
          try {
            await apiPost(
              `${base}/v1/plaid/exchange`,
              {
                public_token: publicToken,
                institution_id: metadata.institution?.institution_id ?? null,
                institution_name: metadata.institution?.name ?? null,
              },
              onUnauthorized,
            );
            setNotice({
              kind: "success",
              text: "Bank connected successfully.",
            });
            await loadConnections();
          } catch (e) {
            setNotice({
              kind: "error",
              text:
                e instanceof ApiError
                  ? e.message
                  : e instanceof Error
                    ? e.message
                    : "Could not complete bank link.",
            });
          } finally {
            setBusy(false);
          }
        },
        onExit: () => {
          setBusy(false);
        },
      });
    } catch (e) {
      setNotice({
        kind: "error",
        text:
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Could not start Plaid Link.",
      });
      setBusy(false);
    }
  }, [loadConnections, onUnauthorized]);

  const disconnect = useCallback(
    async (connectionId: string) => {
      const base = getApiBaseUrl();
      if (!base) return;

      setNotice(null);
      setDisconnectingId(connectionId);
      try {
        await apiDelete(`${base}/v1/plaid/connections/${connectionId}`, onUnauthorized);
        setNotice({
          kind: "success",
          text: "Bank connection removed.",
        });
        await loadConnections();
      } catch (e) {
        setNotice({
          kind: "error",
          text:
            e instanceof ApiError
              ? e.message
              : e instanceof Error
                ? e.message
                : "Could not disconnect.",
        });
      } finally {
        setDisconnectingId(null);
      }
    },
    [loadConnections, onUnauthorized],
  );

  const activeConnections = connections.filter((c) => c.status === "active");

  if (loadState === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4">
        <p className="text-sm text-[#454652]">Verifying your session…</p>
      </main>
    );
  }

  if (configError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4 py-10">
        <Card className="w-full max-w-lg rounded-[36px] border-red-200 p-8 shadow-sm">
          <p className="text-sm text-red-900">{configError}</p>
        </Card>
      </main>
    );
  }

  const investmentsData = investments ?? {
    status: "loading" as const,
    accounts: [],
    holdings: [],
    securities: [],
    last_sync_at: null,
  };

  const renderTabContent = () => {
    if (activeConnections.length === 0) {
      return (
        <div className="flex flex-col gap-4">
          <Button
            type="button"
            onClick={connectPlaid}
            disabled={busy}
            className="h-[54px] w-full rounded-[18px] bg-[#0057FF] text-xl font-black tracking-[-0.04em] text-white hover:bg-[#0057FF]/90 disabled:opacity-60"
          >
            {busy ? "Working…" : "Connect Plaid"}
          </Button>
          <p className="text-xs text-[#737373]">
            You will sign in to your bank in Plaid's secure window. We
            only store encrypted tokens on our servers.
          </p>
        </div>
      );
    }

    switch (activeTab) {
      case "dashboard":
        return (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-950">
              <p className="font-semibold">Plaid is connected</p>
              <p className="mt-1 text-green-900/90">
                Your bank link is active. You can disconnect at any time; you
                will need to link again to pull fresh data.
              </p>
              <ul className="mt-3 space-y-3">
                {activeConnections.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-col gap-2 rounded-lg border border-green-200/80 bg-white/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-semibold text-[#141414]">
                        {c.institution_name ?? "Linked institution"}
                      </div>
                      {c.created_at ? (
                        <div className="text-xs text-[#737373]">
                          Linked {new Date(c.created_at).toLocaleString()}
                        </div>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 border-red-300 text-red-800 hover:bg-red-50"
                      disabled={disconnectingId !== null}
                      onClick={() => disconnect(c.id)}
                    >
                      {disconnectingId === c.id ? "Disconnecting…" : "Disconnect"}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
            <InvestmentsDisplay
              data={investmentsData}
              loading={investmentsLoading}
              error={investmentsError}
              syncing={syncing}
              onSync={() => {
                const active = activeConnections[0];
                if (active) syncInvestments(active.id);
              }}
            />
          </div>
        );

      case "accounts":
        return (
          <AccountsDisplay
            accounts={investmentsData.accounts}
            loading={investmentsLoading}
            error={investmentsError}
            onUnauthorized={onUnauthorized}
          />
        );

      case "holdings":
        return (
          <HoldingsDisplay
            holdings={investmentsData.holdings}
            securities={investmentsData.securities}
            accounts={investmentsData.accounts}
            loading={investmentsLoading}
            error={investmentsError}
            onUnauthorized={onUnauthorized}
          />
        );

      case "transactions":
        return (
          <TransactionsDisplay
            onUnauthorized={onUnauthorized}
          />
        );

      default:
        return null;
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-white px-4 py-10">
      <Card className="w-full rounded-[36px] border-border bg-white p-0 shadow-[0px_4px_4px_rgba(0,0,0,0.25)]">
        <div className="p-8 sm:p-12 lg:p-16">
          <CardHeader className="p-0">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <CardTitle className="text-[28px] font-black leading-[42px] tracking-[-0.04em] text-[#1C1B1B]">
                  Dashboard
                </CardTitle>
                <CardDescription className="mt-0 text-base leading-6 text-[#454652]">
                  Manage your Plaid bank link for importing accounts and holdings.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={logout}
                className="h-11 shrink-0 rounded-xl border-[#C4C4C4] px-5 text-sm font-bold tracking-[-0.04em] text-[#2D2D2D] hover:bg-[#F5F5F5]"
              >
                Log out
              </Button>
            </div>
          </CardHeader>

          {activeConnections.length > 0 && (
            <div className="mt-6">
              <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />
            </div>
          )}

          <CardContent className="p-0">
            <div className="mt-6 flex flex-col gap-4">
              {notice?.kind === "success" ? (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                  {notice.text}
                </div>
              ) : null}
              {notice?.kind === "error" ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                  {notice.text}
                </div>
              ) : null}

              {connections.some((c) => c.status !== "active") && activeTab === "dashboard" ? (
                <p className="text-xs text-[#737373]">
                  Some previous connections are inactive. Use disconnect to clean
                  up, or connect again if needed.
                </p>
              ) : null}

              {renderTabContent()}
            </div>
          </CardContent>
        </div>
      </Card>
    </main>
  );
}
