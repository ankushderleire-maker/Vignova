"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Briefcase,
  Search,
  Settings,
  LogOut,
  UserCircle,
  Zap,
  History,
  Sparkles,
  Chrome,
  FileText,
  ScanLine
} from "lucide-react";

const navigationGroups = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Resumes & Profiles",
    items: [
      { name: "Master Profile", href: "/dashboard/profile", icon: UserCircle },
      { name: "Resume Generator", href: "/dashboard/generator", icon: Zap, isPro: true },
      { name: "Saved Resumes", href: "/dashboard/resumes", icon: History },
      { name: "Cover Letter", href: "/dashboard/cover-letter", icon: FileText },
    ],
  },
  {
    label: "Job Tracking",
    items: [
      { name: "Job Tracker", href: "/dashboard/jobs", icon: Briefcase },
      { name: "ATS Score", href: "/dashboard/ats-score", icon: ScanLine, isNew: true },
      { name: "Find Jobs", href: "/dashboard/find-jobs", icon: Search, isNew: true },
    ],
  },
  {
    label: "Apps & Tools",
    items: [
      { name: "Extension", href: "/dashboard/extension", icon: Chrome },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-[var(--sidebar-bg)] border-r border-[var(--border-color)] relative overflow-hidden transition-colors duration-300">
      {/* Subtle Green Glow for Sidebar bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[var(--primary)]/10 to-transparent pointer-events-none" />

      {/* Logo Area */}
      <div className="flex h-16 items-center px-6 bg-[#000000] border-b border-white/10 z-10">
        <div className="flex items-end">
          <img src="/logo.png" alt="Vignova Logo" width={40} height={40} className="w-10 h-10 object-contain" />
          <span className="text-lg font-bold text-white tracking-tight -ml-1.5 mb-0.5">VIGNOVA</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 z-10 overflow-y-auto flex flex-col gap-4">
        {navigationGroups.map((group, groupIndex) => (
          <div key={group.label}>
            {/* Section Header */}
            {group.label && (
              <div className="px-3 mb-2 flex items-center">
                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider opacity-60">
                  {group.label}
                </span>
              </div>
            )}

            {/* Nav Items */}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const isProItem = (item as any).isPro;
                const isUpcoming = (item as any).isUpcoming;
                const isNew = (item as any).isNew;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${isActive
                      ? "bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 shadow-[0_0_15px_rgba(var(--primary),0.05)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--foreground)]/5 hover:text-[var(--foreground)] border border-transparent"
                      } ${isProItem ? "hover:border-[var(--primary)]/30" : ""}`}
                  >
                    <item.icon
                      className={`mr-3 h-4 w-4 flex-shrink-0 transition-colors ${isActive
                        ? "text-[var(--primary)]"
                        : isProItem
                          ? "text-[var(--primary)] group-hover:text-[var(--primary)]"
                          : "text-[var(--text-secondary)] group-hover:text-[var(--foreground)]"
                        }`}
                    />

                    <span>{item.name}</span>

                    {/* PRO BADGE */}
                    {isProItem && (
                      <span className="ml-auto text-[9px] font-bold bg-[var(--primary)] text-white px-1.5 py-0.5 rounded border border-[var(--primary)]/50 shadow-[0_0_10px_rgba(var(--primary),0.2)]">
                        PRO
                      </span>
                    )}

                    {/* NEW BADGE */}
                    {isNew && (
                      <span className="ml-auto text-[9px] font-bold bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded border border-blue-500/20">
                        NEW
                      </span>
                    )}

                    {/* UPCOMING BADGE */}
                    {isUpcoming && (
                      <span className="ml-auto text-[9px] font-bold bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20">
                        Soon
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Separator */}
            {groupIndex < navigationGroups.length - 1 && (
              <hr className="mt-4 border-[var(--border-color)]/30" />
            )}
          </div>
        ))}
      </nav>

      {/* Logout Section */}

    </div>
  );
}