"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Chrome,
  Crown,
  FileText,
  Gift,
  Loader2,
  UserCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";

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

const periodOptions = [
  { value: "day", label: "Days" },
  { value: "week", label: "Weeks" },
  { value: "month", label: "Months" },
] as const;

function formatTick(value: string, period: "day" | "week" | "month") {
  if (period !== "day") return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(-2);
  return String(date.getDate()).padStart(2, "0");
}

function DashboardCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-[#d8e3f4] bg-white shadow-[0_16px_45px_rgba(35,72,124,0.10)] ${className}`}>
      {children}
    </section>
  );
}

function IconTile({ icon: Icon, tone = "blue" }: { icon: LucideIcon; tone?: "blue" | "purple" | "green" | "orange" }) {
  const toneClass = {
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
    green: "bg-emerald-100 text-emerald-600",
    orange: "bg-orange-100 text-orange-600",
  }[tone];

  return (
    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}>
      <Icon className="h-7 w-7" />
    </div>
  );
}

function DailyStatistics({
  data,
  period,
  onPeriodChange,
}: {
  data: DashboardStats["stats"];
  period: "day" | "week" | "month";
  onPeriodChange: (period: "day" | "week" | "month") => void;
}) {
  const chart = useMemo(() => {
    const items = data?.length ? data : [];
    const width = 980;
    const height = 220;
    const padX = 42;
    const padY = 24;
    const maxTotal = Math.max(4, ...items.map((item) => item.total || 0));
    const plotW = width - padX * 2;
    const plotH = height - padY * 2;
    const points = items.map((item, index) => {
      const x = padX + (items.length <= 1 ? 0 : (index / (items.length - 1)) * plotW);
      const y = padY + plotH - ((item.total || 0) / maxTotal) * plotH;
      return { ...item, x, y };
    });
    const line = points.map((point) => `${point.x},${point.y}`).join(" ");
    return { width, height, padX, padY, plotW, plotH, maxTotal, points, line };
  }, [data]);

  const hasActivity = chart.points.some((point) => point.total > 0);
  const yLabels = [4, 3, 2, 1, 0];

  return (
    <DashboardCard className="p-6">
      <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-4">
          <IconTile icon={BarChart3} tone="blue" />
          <div>
            <h2 className="text-2xl font-bold text-[#081432]">Daily Statistics</h2>
            <p className="text-sm font-medium text-[#62708d]">Resume generation activity over time</p>
          </div>
        </div>

        <div className="grid w-full grid-cols-3 rounded-xl border border-[#cddaf0] bg-white p-1 shadow-inner md:w-[280px]">
          {periodOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onPeriodChange(option.value)}
              className={`h-9 rounded-lg text-sm font-semibold transition ${
                period === option.value
                  ? "bg-blue-600 text-white shadow-[0_8px_18px_rgba(37,99,235,0.32)]"
                  : "text-[#62708d] hover:bg-blue-50 hover:text-blue-700"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative min-h-[270px] overflow-hidden">
        <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="h-[250px] w-full" role="img" aria-label="Resume activity chart">
          {yLabels.map((label) => {
            const y = chart.padY + chart.plotH - (label / chart.maxTotal) * chart.plotH;
            return (
              <g key={label}>
                <text x="18" y={y + 4} className="fill-[#6d7b99] text-[12px] font-semibold">
                  {label}
                </text>
                <line x1={chart.padX} x2={chart.width - chart.padX} y1={y} y2={y} stroke="#dce5f3" strokeDasharray="3 3" />
              </g>
            );
          })}
          {Array.from({ length: Math.max(chart.points.length, 1) }).map((_, index) => {
            const x = chart.padX + (chart.points.length <= 1 ? 0 : (index / (chart.points.length - 1)) * chart.plotW);
            return <line key={index} x1={x} x2={x} y1={chart.padY} y2={chart.height - chart.padY} stroke="#e7edf7" strokeDasharray="3 3" />;
          })}
          <polyline points={chart.line} fill="none" stroke="#1f66ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {chart.points.map((point, index) => (
            <circle key={`${point.date}-${index}`} cx={point.x} cy={point.y} r="3.8" fill="#1f66ff" stroke="#fff" strokeWidth="2" />
          ))}
          {chart.points.map((point, index) => (
            <text key={`${point.date}-${index}-label`} x={point.x} y={chart.height - 4} textAnchor="middle" className="fill-[#6d7b99] text-[12px] font-semibold">
              {formatTick(point.date, period)}
            </text>
          ))}
        </svg>

        {!hasActivity && (
          <div className="pointer-events-none absolute inset-x-0 top-[62px] flex flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <FileText className="h-8 w-8" />
            </div>
            <p className="text-sm font-bold text-[#081432]">No activity yet</p>
            <p className="text-xs font-medium text-[#6d7b99]">Create your first resume to see data here</p>
          </div>
        )}
      </div>
    </DashboardCard>
  );
}

function StatCard({
  icon,
  tone,
  title,
  value,
  description,
  trend,
}: {
  icon: LucideIcon;
  tone: "blue" | "purple";
  title: string;
  value: number;
  description: string;
  trend?: number;
}) {
  return (
    <DashboardCard className="min-h-[205px] p-6">
      <div className="mb-5 flex items-start justify-between">
        <IconTile icon={icon} tone={tone} />
        {typeof trend === "number" && (
          <div className="text-right text-sm font-bold text-emerald-600">
            <span>{trend >= 0 ? "+" : "-"} {Math.abs(trend)}%</span>
            <p className="mt-1 text-xs font-medium text-[#6d7b99]">vs. last period</p>
          </div>
        )}
      </div>
      <p className="mb-3 text-base font-bold text-[#081432]">{title}</p>
      <p className="text-5xl font-extrabold leading-none text-[#081432]">{value}</p>
      <p className="mt-5 max-w-[220px] text-sm font-medium leading-relaxed text-[#7a88a6]">{description}</p>
    </DashboardCard>
  );
}

function JobsCard({ total, jobStats }: { total: number; jobStats?: DashboardStats["jobStats"] }) {
  const rows = [
    { label: "Saved", value: jobStats?.saved || 0, color: "bg-emerald-400" },
    { label: "Applied", value: jobStats?.applied || 0, color: "bg-blue-500" },
    { label: "Interviews", value: jobStats?.interviewing || 0, color: "bg-purple-500" },
    { label: "Offers", value: jobStats?.offer || 0, color: "bg-emerald-500" },
  ];

  return (
    <DashboardCard className="min-h-[205px] p-6">
      <div className="flex h-full gap-6">
        <div className="flex flex-1 flex-col">
          <IconTile icon={Gift} tone="green" />
          <p className="mb-3 mt-5 text-base font-bold text-[#081432]">Jobs Tracked</p>
          <p className="text-5xl font-extrabold leading-none text-[#081432]">{total}</p>
          <p className="mt-auto max-w-[160px] text-sm font-medium leading-relaxed text-[#7a88a6]">Total jobs in your pipeline</p>
        </div>
        <div className="my-3 w-px bg-emerald-200" />
        <div className="flex min-w-[120px] flex-col justify-center gap-3">
          {rows.map((row) => (
            <div key={row.label} className="grid grid-cols-[70px_1fr] items-center gap-3">
              <span className="text-sm font-medium text-[#71809d]">{row.label}</span>
              <div>
                <span className="text-base font-bold text-[#081432]">{row.value}</span>
                <div className="mt-1 h-0.5 rounded-full bg-[#d7dfec]">
                  <div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.value > 0 ? 100 : 18}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardCard>
  );
}

function SubscriptionCard({ plan, credits }: { plan: string; credits: number }) {
  const maxCredits = plan?.toUpperCase() === "PREMIUM" ? 150 : plan?.toUpperCase() === "PRO" ? 50 : 3;
  const percent = Math.min(100, (credits / maxCredits) * 100);

  return (
    <DashboardCard className="min-h-[205px] bg-gradient-to-br from-white via-white to-orange-50 p-6">
      <div className="mb-5 flex items-start justify-between">
        <IconTile icon={Zap} tone="orange" />
        <span className="rounded-lg bg-[#edf1f7] px-3 py-1 text-xs font-extrabold uppercase text-[#253452]">{plan || "Free"}</span>
      </div>
      <p className="text-base font-bold text-[#081432]">Subscription</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-4xl font-extrabold leading-none text-[#081432]">{credits}</p>
        <p className="text-sm font-medium text-[#6d7b99]">credits left</p>
      </div>
      <div className="my-4 h-2 rounded-full bg-[#d4dbe7]">
        <div className="h-full rounded-full bg-blue-600" style={{ width: `${percent}%` }} />
      </div>
      <Link href="/dashboard/billing" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-bold text-white shadow-[0_12px_24px_rgba(37,99,235,0.28)] transition hover:bg-blue-700">
        <Crown className="h-4 w-4 fill-white" />
        Upgrade Plan
      </Link>
    </DashboardCard>
  );
}

function ActionCard({
  href,
  icon,
  tone,
  eyebrow,
  title,
  description,
}: {
  href: string;
  icon: LucideIcon;
  tone: "blue" | "green";
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className={`group relative min-h-[165px] overflow-hidden rounded-2xl border border-[#d8e3f4] bg-white p-7 shadow-[0_16px_45px_rgba(35,72,124,0.10)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_55px_rgba(35,72,124,0.14)] ${tone === "green" ? "bg-gradient-to-br from-emerald-50 via-white to-emerald-50" : "bg-gradient-to-br from-blue-50 via-white to-white"}`}>
      <div className="relative z-10 flex items-start gap-6">
        <IconTile icon={icon} tone={tone === "green" ? "green" : "blue"} />
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#6d7b99]">{eyebrow}</p>
          <h3 className="text-2xl font-extrabold text-[#081432]">{title}</h3>
          <p className="mt-2 max-w-[460px] text-sm font-medium leading-relaxed text-[#6d7b99]">{description}</p>
        </div>
        <span className={`mt-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-lg transition group-hover:scale-105 ${tone === "green" ? "bg-emerald-500" : "bg-blue-600"}`}>
          <ArrowRight className="h-5 w-5" />
        </span>
      </div>
      <div className="absolute right-16 top-6 h-36 w-24 rotate-[-12deg] rounded-xl bg-white/70 shadow-inner">
        <div className="mx-auto mt-7 h-2 w-14 rounded-full bg-blue-100" />
        <div className="mx-auto mt-4 h-2 w-16 rounded-full bg-emerald-100" />
        <div className="mx-auto mt-4 h-2 w-12 rounded-full bg-blue-100" />
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsRes, subRes] = await Promise.all([
          fetch(`/api/dashboard/stats?period=${period}`),
          fetch("/api/subscription"),
        ]);
        setStats(await statsRes.json());
        setSubscription(await subRes.json());
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [period]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div id="tour-dashboard" className="mx-auto flex w-full max-w-[1480px] flex-col gap-6">
      <DailyStatistics data={stats?.stats || []} period={period} onPeriodChange={setPeriod} />

      <div id="tour-dashboard-stats" className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Resumes Created"
          value={stats?.totalResumes || 0}
          icon={FileText}
          tone="blue"
          trend={12}
          description="Resumes generated with Vignova"
        />
        <StatCard
          title="Extension Created CVs"
          value={stats?.extensionResumes || 0}
          icon={Chrome}
          tone="purple"
          description="CVs generated via browser extension"
        />
        <JobsCard total={stats?.totalJobs || 0} jobStats={stats?.jobStats} />
        <SubscriptionCard plan={subscription?.plan_type || "Free"} credits={subscription?.credits_remaining ?? 3} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ActionCard
          href="/dashboard/profile"
          icon={UserCircle}
          tone="green"
          eyebrow="Build your foundation"
          title="Master Profile"
          description="Keep your skills, experience, and career information up to date for better, more tailored resumes."
        />
        <ActionCard
          href="/dashboard/generator"
          icon={FileText}
          tone="blue"
          eyebrow="Create your next opportunity"
          title="Generate Resume"
          description="Create tailored, professional resumes for your saved jobs in seconds."
        />
      </div>
    </div>
  );
}
