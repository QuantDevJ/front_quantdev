"use client";

import { cn } from "@/lib/utils";

export type DashboardTab = "dashboard" | "accounts" | "holdings" | "transactions";

type DashboardTabsProps = {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
};

const tabs: { id: DashboardTab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "accounts", label: "Accounts" },
  { id: "holdings", label: "Holdings" },
  { id: "transactions", label: "Transactions" },
];

export function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps) {
  return (
    <nav className="border-b border-[#E5E5E5]">
      <div className="flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "px-4 py-3 text-sm font-medium transition-colors relative",
              activeTab === tab.id
                ? "text-[#0057FF]"
                : "text-[#737373] hover:text-[#454652]"
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0057FF]" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
