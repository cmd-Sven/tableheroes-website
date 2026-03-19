"use client";

import { useState, useEffect } from "react";
import { Settings, Calendar, Users, User, Shield, Book, ScrollText } from "lucide-react";

type TabKey = "overview" | "sessions" | "npcs" | "factions" | "lore" | "quests" | "members";

type CampaignTabsProps = {
  pendingCount: number;
  overviewContent: React.ReactNode;
  sessionsContent: React.ReactNode;
  npcsContent?: React.ReactNode;
  factionsContent?: React.ReactNode;
  loreContent?: React.ReactNode;
  questContent?: React.ReactNode;
  membersContent: React.ReactNode;
  isGM: boolean;
};

export function CampaignTabs({
  pendingCount,
  overviewContent,
  sessionsContent,
  npcsContent,
  factionsContent,
  loreContent,
  questContent,
  membersContent,
  isGM,
}: CampaignTabsProps) {
  // Always start with "overview" to avoid hydration mismatch
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  
  // Check URL hash after mount (client-side only)
  useEffect(() => {
    if (window.location.hash === "#members" && isGM) {
      setActiveTab("members");
    }
  }, [isGM]);

  const tabs = [
    { id: "overview", key: "overview" as TabKey, label: "Übersicht", icon: Settings },
    { id: "sessions", key: "sessions" as TabKey, label: "Sessions", icon: Calendar },
    ...(npcsContent ? [{ id: "npcs", key: "npcs" as TabKey, label: "NPCs", icon: User }] : []),
    ...(factionsContent ? [{ id: "factions", key: "factions" as TabKey, label: "Fraktionen", icon: Shield }] : []),
    ...(loreContent ? [{ id: "lore", key: "lore" as TabKey, label: "Welt & Lore", icon: Book }] : []),
    ...(questContent ? [{ id: "quests", key: "quests" as TabKey, label: "Quests", icon: ScrollText }] : []),
    ...(isGM ? [{ id: "members", key: "members" as TabKey, label: "Teilnehmer", icon: Users, badge: pendingCount }] : []),
  ];

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b border-hero-dark mb-6">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.id || tab.key || `tab-${index}`}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex items-center gap-2 px-4 py-3 font-barlow font-bold uppercase text-sm transition-colors whitespace-nowrap ${
                  isActive
                    ? "text-hero-vibrant border-b-2 border-hero-vibrant"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-red-600 text-xs font-bold text-white">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "overview" && overviewContent}
        {activeTab === "sessions" && sessionsContent}
        {activeTab === "npcs" && npcsContent}
        {activeTab === "factions" && factionsContent}
        {activeTab === "lore" && loreContent}
        {activeTab === "quests" && questContent}
        {activeTab === "members" && membersContent}
      </div>
    </div>
  );
}

