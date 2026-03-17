"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  Zap,
  LayoutDashboard,
  User,
  FileText,
  Briefcase,
  Settings,
  LogOut,
  CreditCard,
  HelpCircle,
  Users,
  ChevronDown,
  Moon,
  Sun,
  type LucideIcon
} from "lucide-react";
import { useTheme } from "@/components/providers/ThemeContext";

// Map routes to page info with icons and descriptions
const pageInfo: Record<string, { title: string; description: string; icon: LucideIcon }> = {
  "/dashboard": {
    title: "Dashboard",
    description: "Track your resume generation activity and manage your account",
    icon: LayoutDashboard,
  },
  "/dashboard/profile": {
    title: "Master Profile",
    description: "The comprehensive data source your AI agent uses to tailor every resume",
    icon: User,
  },
  "/dashboard/generator": {
    title: "Resume Generator",
    description: "Select a saved job to instantly generate a tailored resume. Uses 1 Credit per generation",
    icon: Zap,
  },
  "/dashboard/resumes": {
    title: "Saved Resumes",
    description: "View and manage all your generated resumes",
    icon: FileText,
  },
  "/dashboard/jobs": {
    title: "Jobs",
    description: "Track your job applications and saved positions",
    icon: Briefcase,
  },
  "/dashboard/settings": {
    title: "Settings",
    description: "Customize your preferences and account settings",
    icon: Settings,
  },
};

export function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();

  // Fetch live subscription data
  const [sub, setSub] = useState<{ plan_type: string; credits_remaining: number; has_unlimited_resumes: boolean } | null>(null);
  useEffect(() => {
    fetch("/api/subscription")
      .then((r) => r.json())
      .then((data) => setSub({
        plan_type: data.plan_type || "FREE",
        credits_remaining: data.credits_remaining ?? 3,
        has_unlimited_resumes: data.has_unlimited_resumes || false,
      }))
      .catch(() => setSub({ plan_type: "FREE", credits_remaining: 3, has_unlimited_resumes: false }));
  }, []);

  const planName = sub?.plan_type === "PREMIUM" ? "Premium" : sub?.plan_type === "PRO" ? "Pro" : "Free";
  const planColor = sub?.plan_type === "PREMIUM" ? "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30" : sub?.plan_type === "PRO" ? "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30" : "text-gray-600 dark:text-gray-400 bg-gray-500/10 border-gray-500/30";
  const credits = sub?.credits_remaining ?? 3;
  const isUnlimited = sub?.has_unlimited_resumes || false;
  const badgeBg = sub?.plan_type === "PREMIUM" ? "bg-amber-500/10 border-amber-500/30" : sub?.plan_type === "PRO" ? "bg-blue-500/10 border-blue-500/30" : "bg-gray-500/10 border-gray-500/30";
  const badgeText = sub?.plan_type === "PREMIUM" ? "text-amber-600 dark:text-amber-400" : sub?.plan_type === "PRO" ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400";
  const planLabelColor = sub?.plan_type === "PREMIUM" ? "text-amber-600 dark:text-amber-400" : sub?.plan_type === "PRO" ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400";

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get the page info based on current path
  const getPageInfo = () => {
    // Direct match first
    if (pageInfo[pathname]) {
      return pageInfo[pathname];
    }
    // Check for partial matches (for nested routes like /dashboard/jobs/[id])
    for (const [route, info] of Object.entries(pageInfo)) {
      if (pathname.startsWith(route) && route !== "/dashboard") {
        return info;
      }
    }
    return pageInfo["/dashboard"];
  };

  const currentPage = getPageInfo();
  const Icon = currentPage.icon;

  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--border-color)] bg-[var(--sidebar-bg)]/80 px-8 backdrop-blur-md relative z-20">
      {/* Left side: Icon + Page Title + Description */}
      <div className="flex items-center gap-3 min-w-0 pr-4">
        <div className="p-2 bg-[var(--primary)]/10 rounded-lg shrink-0">
          <Icon className="h-4 w-4 text-[var(--primary)]" />
        </div>
        <div className="min-w-0 flex items-center gap-3">
          <h1 className="text-xl font-bold text-[var(--foreground)] leading-tight tracking-tight truncate shrink-0">{currentPage.title}</h1>
          <p className="text-xs text-[var(--text-secondary)] hidden md:block truncate mt-0.5">
            {currentPage.description.includes("1 Credit") ? (
              <>
                {currentPage.description.split("1 Credit")[0]}
                <span className="text-[var(--primary)] font-semibold">1 Credit</span>
                {currentPage.description.split("1 Credit")[1]}
              </>
            ) : (
              currentPage.description
            )}
          </p>
        </div>
      </div>

      {/* Right side: Credits & Profile */}
      <div className="flex items-center gap-4 sm:gap-6 shrink-0">

        {/* Credits Counter (Monetization Visibility) */}
        <div className={`flex items-center gap-2 rounded-full px-4 py-1.5 border ${badgeBg}`}>
          <Zap className={`h-4 w-4 ${badgeText} fill-current`} />
          <span className={`text-sm font-semibold ${badgeText}`}>
            {isUnlimited ? "∞" : credits} Credits
          </span>
        </div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 pl-6 border-l border-[var(--border-color)] outline-none group"
          >
            <div className="text-right hidden sm:block group-hover:opacity-80 transition-opacity">
              <p className="text-sm font-medium text-[var(--foreground)]">
                {session?.user?.name || "User"}
              </p>
              <p className={`text-xs font-medium ${planLabelColor}`}>{planName} Plan</p>
            </div>
            <div className="relative">
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-[var(--primary)] to-[var(--primary)]/80 p-[2px] transition-transform group-hover:scale-105">
                <div className="h-full w-full rounded-full bg-[var(--background)] flex items-center justify-center overflow-hidden">
                  {session?.user?.image ? (
                    <img src={session.user.image} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-[var(--foreground)]">
                      {session?.user?.name?.[0]?.toUpperCase() || "U"}
                    </span>
                  )}
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-[var(--background)] rounded-full p-0.5 border border-[var(--border-color)]">
                <ChevronDown className="h-3 w-3 text-[var(--text-secondary)]" />
              </div>
            </div>
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 origin-top-right rounded-xl bg-[var(--sidebar-bg)] border border-[var(--border-color)] shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="p-4 border-b border-[var(--border-color)]">
                <p className="text-sm font-semibold text-[var(--foreground)] truncate">{session?.user?.name}</p>
                <p className="text-xs text-[var(--text-secondary)] truncate">{session?.user?.email}</p>
              </div>

              {/* Menu Items */}
              <div className="p-2 space-y-1">
                {/* 
                   "Master Profile" is for resume data (/dashboard/profile).
                   "User Profile" (Account) is what this dropdown represents.
                   For now, we'll link "My Account" to settings or a placeholder, 
                   to avoid confusion with the Master Profile page.
                */}
                <Link
                  href="/dashboard/settings"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] rounded-lg hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--foreground)] transition-colors"
                >
                  <User className="h-4 w-4" />
                  My Account
                </Link>

                <Link
                  href="#"
                  className="flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] rounded-lg hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--foreground)] transition-colors"
                >
                  <Users className="h-4 w-4" />
                  Community
                </Link>

                <Link
                  href="/dashboard/billing"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center justify-between px-3 py-2 text-sm text-[var(--text-secondary)] rounded-lg hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--foreground)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-4 w-4" />
                    Subscription
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${planColor}`}>
                    {sub?.plan_type || "FREE"}
                  </span>
                </Link>

                <Link
                  href="/dashboard/settings"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] rounded-lg hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--foreground)] transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </div>

              <div className="h-px bg-[var(--border-color)] mx-2 my-1" />

              <div className="p-2 space-y-1">
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="flex w-full items-center justify-between px-3 py-2 text-sm text-[var(--text-secondary)] rounded-lg hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--foreground)] transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                    Dark Mode
                  </div>
                  <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${theme === 'dark' ? 'bg-[var(--primary)]' : 'bg-gray-300'}`}>
                    <div className={`w-3 h-3 rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </button>

                <Link
                  href="#"
                  className="flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] rounded-lg hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--foreground)] transition-colors"
                >
                  <HelpCircle className="h-4 w-4" />
                  Help center
                </Link>

                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-500 rounded-lg hover:bg-red-500/10 hover:text-red-600 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
