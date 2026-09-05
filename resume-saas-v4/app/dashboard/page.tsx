"use client";

import { useEffect, useState } from "react";
import { StatsGraph } from "@/components/dashboard/StatsGraph";
import { StatCard } from "@/components/dashboard/StatCard";
import { SubscriptionCard } from "@/components/dashboard/SubscriptionCard";
import { ActionCard } from "@/components/dashboard/ActionCard";
import { FileText, Chrome, Briefcase, Loader2 } from "lucide-react";

interface DashboardStats {
  totalResumes: number;
  extensionResumes: number;
  totalJobs: number;
  jobStats?: {
    saved: number;
    applied: number;
    interviewing: number;
    offer: number;
  };
  period: "day" | "week" | "month";
  stats: Array<{ date: string; total: number; manual: number; extension: number }>;
}

interface SubscriptionData {
  plan_type: string;
  credits_remaining: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch stats
      const statsRes = await fetch(`/api/dashboard/stats?period=${period}`);
      const statsData = await statsRes.json();
      setStats(statsData);

      // Fetch subscription
      const subRes = await fetch("/api/subscription");
      const subData = await subRes.json();
      setSubscription(subData);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div id="tour-dashboard" className="space-y-4 max-w-7xl mx-auto p-4 animate-slide-down">
      {/* Stats Graph */}
      {stats && (
        <StatsGraph
          data={stats.stats}
          period={period}
          onPeriodChange={setPeriod}
        />
      )}

      {/* Stat Cards Grid */}
      <div id="tour-dashboard-stats" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Resumes Created"
          count={stats?.totalResumes || 0}
          icon={FileText}
          trend={12}
          color="var(--primary)"
        />

        <StatCard
          title="Extension Created CVs"
          count={stats?.extensionResumes || 0}
          icon={Chrome}
          color="#8B5CF6"
        />

        <StatCard
          title="Jobs Tracked"
          count={stats?.totalJobs || 0}
          icon={Briefcase}
          color="#10B981"
          jobStats={stats?.jobStats}
        />

        <SubscriptionCard
          plan={subscription?.plan_type || "Free"}
          creditsRemaining={subscription?.credits_remaining || 3}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ActionCard
          title="Master Profile"
          description="Update your skills, experience, and career information"
          icon={FileText}
          href="/dashboard/profile"
          color="var(--primary)"
        />

        <ActionCard
          title="Generate Resume"
          description="Create tailored resumes for your saved jobs"
          icon={Chrome}
          href="/dashboard/generator"
          color="#10B981"
        />
      </div>
    </div>
  );
}