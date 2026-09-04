"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Chrome,
  ChevronLeft,
  ChevronRight,
  Crown,
  FileText,
  History,
  LayoutDashboard,
  Linkedin,
  Mic,
  ScanLine,
  Search,
  Sparkles,
  UserCircle,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

const navigationGroups: Array<{
  label: string;
  items: Array<{ name: string; href: string; icon: LucideIcon; badge?: "NEW" | "PRO" }>;
}> = [
  {
    label: "Overview",
    items: [{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Resumes & Profiles",
    items: [
      { name: "Master Profile", href: "/dashboard/profile", icon: UserCircle },
      { name: "LinkedIn Optimizer", href: "/dashboard/linkedin-optimizer", icon: Linkedin, badge: "NEW" },
      { name: "Resume Generator", href: "/dashboard/generator", icon: Zap, badge: "PRO" },
      { name: "Saved Resumes", href: "/dashboard/resumes", icon: History },
      { name: "Cover Letter", href: "/dashboard/cover-letter", icon: FileText },
    ],
  },
  {
    label: "Job Tracking",
    items: [
      { name: "Job Tracker", href: "/dashboard/jobs", icon: Briefcase },
      { name: "ATS Score", href: "/dashboard/ats-score", icon: ScanLine, badge: "NEW" },
      { name: "Find Jobs", href: "/dashboard/find-jobs", icon: Search, badge: "NEW" },
      { name: "Job Scrapper", href: "/dashboard/job-scrapper", icon: Sparkles, badge: "NEW" },
    ],
  },
  {
    label: "Interview",
    items: [{ name: "Interview Prep", href: "/dashboard/interview-prep", icon: Mic, badge: "PRO" }],
  },
  {
    label: "Apps & Tools",
    items: [{ name: "Extension", href: "/dashboard/extension", icon: Chrome }],
  },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden border-r border-[#dde7f5] bg-white text-[#081432]">
      <div className="flex h-[92px] items-center justify-between px-8">
        <Link href="/dashboard" onClick={onClose} className="flex items-center gap-3">
          <img src="/logo.png" alt="Vignova Logo" className="h-12 w-12 object-contain" />
          <div className="leading-tight">
            <p className="text-2xl font-extrabold tracking-tight text-[#12204a]">VIGNOVA</p>
            <p className="text-xs font-medium text-[#667894]">Build Tomorrow, Faster</p>
          </div>
        </Link>

        {onClose ? (
          <button
            onClick={onClose}
            className="rounded-lg border border-[#d7e2f2] p-2 text-[#62708d] transition hover:bg-blue-50 hover:text-blue-700"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        ) : (
          <button
            className="rounded-lg border border-[#d7e2f2] bg-[#f5f8fd] p-2 text-[#48617f] transition hover:bg-blue-50 hover:text-blue-700"
            aria-label="Collapse sidebar"
            type="button"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-4 pb-4">
        {navigationGroups.map((group, groupIndex) => (
          <div key={group.label} className={groupIndex === 0 ? "" : "border-t border-[#e7edf6] pt-5"}>
            <p className="mb-3 px-3 text-xs font-extrabold uppercase tracking-[0.14em] text-[#7b8aa6]">{group.label}</p>
            <div className="mb-5 space-y-1.5">
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex h-12 items-center gap-3 rounded-xl px-4 text-[15px] font-semibold transition ${
                      active
                        ? "bg-blue-50 text-blue-700 shadow-[inset_4px_0_0_#2563eb]"
                        : "text-[#1f2d4a] hover:bg-[#f4f7fc] hover:text-blue-700"
                    }`}
                  >
                    <item.icon className={`h-5 w-5 shrink-0 ${active ? "text-blue-600" : "text-[#283b62]"}`} />
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    {item.badge && (
                      <span className={`rounded-md px-2 py-1 text-[10px] font-extrabold leading-none ${
                        item.badge === "PRO"
                          ? "bg-blue-600 text-white"
                          : "border border-blue-200 bg-blue-100 text-blue-700"
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4">
        <Link
          href="/dashboard/billing"
          onClick={onClose}
          className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-4 text-blue-700 shadow-[0_12px_26px_rgba(37,99,235,0.12)] transition hover:bg-blue-100"
        >
          <div className="flex items-center gap-3">
            <Crown className="h-5 w-5 fill-blue-600 text-blue-600" />
            <div>
              <p className="text-sm font-extrabold">Upgrade to Pro</p>
              <p className="text-xs font-medium text-[#62708d]">Unlock all premium features</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5" />
        </Link>
      </div>
    </aside>
  );
}
