"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  Bell,
  Briefcase,
  ChevronDown,
  Chrome,
  CreditCard,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Linkedin,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  ScanLine,
  Search,
  Settings,
  Sun,
  User,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "@/components/providers/ThemeContext";

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
  "/dashboard/cover-letter": {
    title: "Cover Letter",
    description: "Generate tailored cover letters for your job applications",
    icon: FileText,
  },
  "/dashboard/ats-score": {
    title: "ATS Score",
    description: "Analyze your resume against job descriptions for ATS compatibility",
    icon: ScanLine,
  },
  "/dashboard/find-jobs": {
    title: "Find Jobs",
    description: "Search for new opportunities matching your profile",
    icon: Search,
  },
  "/dashboard/extension": {
    title: "Extension",
    description: "Manage your Vignova browser extension settings",
    icon: Chrome,
  },
  "/dashboard/linkedin-optimizer": {
    title: "LinkedIn Optimizer",
    description: "Connect your profile to maximize your visibility and keyword alignment",
    icon: Linkedin,
  },
  "/dashboard/interview-prep": {
    title: "Interview Prep",
    description: "Generate 15+ tailored interview questions and best-answer hints",
    icon: MessageSquare,
  },
};

interface HeaderProps {
  onMenuClick?: () => void;
}

interface TicketNotification {
  id: string;
  subject?: string;
}

interface SubscriptionSummary {
  plan_type: string;
  credits_remaining: number;
  has_unlimited_resumes: boolean;
}

export function Header({ onMenuClick }: HeaderProps) {
  const session = useSession()?.data;
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadTickets, setUnreadTickets] = useState<TicketNotification[]>([]);
  const [sub, setSub] = useState<SubscriptionSummary | null>(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (!session?.user) return;

    fetch("/api/tickets/unread")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setUnreadTickets(data);
      })
      .catch((err) => console.error("Failed to fetch unread tickets", err));
  }, [session?.user]);

  useEffect(() => {
    fetch("/api/subscription")
      .then((r) => r.json())
      .then((data: Partial<SubscriptionSummary>) =>
        setSub({
          plan_type: data.plan_type || "FREE",
          credits_remaining: data.credits_remaining ?? 3,
          has_unlimited_resumes: data.has_unlimited_resumes || false,
        })
      )
      .catch(() => setSub({ plan_type: "FREE", credits_remaining: 3, has_unlimited_resumes: false }));
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentPage =
    pageInfo[pathname] ||
    Object.entries(pageInfo).find(([route]) => route !== "/dashboard" && pathname.startsWith(route))?.[1] ||
    pageInfo["/dashboard"];
  const Icon = currentPage.icon;
  const planType = sub?.plan_type || "FREE";
  const planName = planType === "PREMIUM" ? "Premium" : planType === "PRO" ? "Pro" : "Free";
  const creditsLabel = sub?.has_unlimited_resumes ? "Unlimited" : `${sub?.credits_remaining ?? 3}`;

  return (
    <header className="relative z-20 flex min-h-[92px] items-center justify-between bg-[#f4f8ff] px-4 py-4 md:px-8">
      <div className="flex min-w-0 items-center gap-3 md:gap-5">
        <button
          onClick={onMenuClick}
          className="shrink-0 rounded-xl border border-[#d7e2f2] bg-white p-2 text-[#253452] shadow-sm transition hover:bg-blue-50 hover:text-blue-700 md:hidden"
          aria-label="Open menu"
          type="button"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-[0_14px_32px_rgba(35,72,124,0.12)]">
          <Icon className="h-7 w-7" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold leading-tight text-[#081432]">{currentPage.title}</h1>
          <p className="mt-1 hidden truncate text-sm font-medium text-[#62708d] md:block">
            {currentPage.description.includes("1 Credit") ? (
              <>
                {currentPage.description.split("1 Credit")[0]}
                <span className="font-bold text-blue-600">1 Credit</span>
                {currentPage.description.split("1 Credit")[1]}
              </>
            ) : (
              currentPage.description
            )}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4 md:gap-6">
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setIsNotificationsOpen((open) => !open)}
            className="relative rounded-xl p-2 text-[#26395f] transition hover:bg-white hover:text-blue-700"
            aria-label="Notifications"
            type="button"
          >
            <Bell className="h-5 w-5" />
            {unreadTickets.length > 0 && <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#f4f8ff]" />}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 top-full mt-3 w-72 origin-top-right overflow-hidden rounded-2xl border border-[#d8e3f4] bg-white shadow-[0_20px_55px_rgba(35,72,124,0.16)]">
              <div className="border-b border-[#e7edf6] p-4">
                <h3 className="text-sm font-extrabold text-[#081432]">Notifications</h3>
              </div>
              <div className="max-h-72 overflow-y-auto p-2">
                {unreadTickets.length === 0 ? (
                  <div className="p-5 text-center text-sm font-medium text-[#6d7b99]">No new notifications</div>
                ) : (
                  unreadTickets.map((ticket) => (
                    <Link
                      key={ticket.id}
                      href={`/dashboard/help/${ticket.id}`}
                      onClick={() => setIsNotificationsOpen(false)}
                      className="block rounded-xl p-3 transition hover:bg-blue-50"
                    >
                      <div className="flex gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                          <MessageSquare className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold leading-tight text-[#081432]">You got a response on your ticket</p>
                          <p className="mt-1 truncate text-xs font-medium text-[#6d7b99]">{ticket.subject}</p>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div id="tour-credits" className="flex h-11 items-center gap-2 rounded-full border border-[#d7e2f2] bg-white px-4 text-[#081432] shadow-sm">
          <Zap className="h-4 w-4 fill-blue-600 text-blue-600" />
          <span className="text-sm font-extrabold">
            {creditsLabel}
            <span className="hidden sm:inline"> Credits</span>
          </span>
        </div>

        <div className="hidden h-8 w-px bg-[#d7e2f2] sm:block" />

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen((open) => !open)}
            className="flex items-center gap-3 rounded-2xl px-1 py-1 outline-none transition hover:bg-white"
            type="button"
          >
            <div className="h-11 w-11 overflow-hidden rounded-full border border-[#d7e2f2] bg-white p-[2px] shadow-sm">
              {session?.user?.image ? (
                <img src={session.user.image} alt="Profile" className="h-full w-full rounded-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-blue-100 text-sm font-extrabold text-blue-700">
                  {session?.user?.name?.[0]?.toUpperCase() || "U"}
                </div>
              )}
            </div>
            <div className="hidden text-left sm:block">
              <p className="max-w-[140px] truncate text-sm font-extrabold text-[#081432]">{session?.user?.name || "User"}</p>
              <p className="text-xs font-semibold text-[#62708d]">{planName} Plan</p>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-[#62708d] sm:block" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-3 w-64 origin-top-right overflow-hidden rounded-2xl border border-[#d8e3f4] bg-white shadow-[0_20px_55px_rgba(35,72,124,0.16)]">
              <div className="border-b border-[#e7edf6] p-4">
                <p className="truncate text-sm font-extrabold text-[#081432]">{session?.user?.name || "User"}</p>
                <p className="truncate text-xs font-medium text-[#6d7b99]">{session?.user?.email || "Signed in"}</p>
              </div>

              <div className="space-y-1 p-2">
                <DropdownLink href="/dashboard/settings" icon={User} label="My Account" onClick={() => setIsDropdownOpen(false)} />
                <DropdownLink href="#" icon={Users} label="Community" />
                <DropdownLink href="/dashboard/billing" icon={CreditCard} label="Subscription" badge={planType} onClick={() => setIsDropdownOpen(false)} />
                <DropdownLink href="/dashboard/settings" icon={Settings} label="Settings" onClick={() => setIsDropdownOpen(false)} />
              </div>

              <div className="mx-2 h-px bg-[#e7edf6]" />

              <div className="space-y-1 p-2">
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#39496a] transition hover:bg-blue-50 hover:text-[#081432]"
                  type="button"
                >
                  <span className="flex items-center gap-3">
                    {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                    Dark Mode
                  </span>
                  <span className={`flex h-4 w-8 rounded-full p-0.5 transition ${theme === "dark" ? "bg-blue-600" : "bg-[#ccd6e6]"}`}>
                    <span className={`h-3 w-3 rounded-full bg-white transition ${theme === "dark" ? "translate-x-4" : "translate-x-0"}`} />
                  </span>
                </button>
                <DropdownLink href="/dashboard/help" icon={HelpCircle} label="Help center" onClick={() => setIsDropdownOpen(false)} />
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-500 transition hover:bg-red-50"
                  type="button"
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

function DropdownLink({
  href,
  icon: Icon,
  label,
  badge,
  onClick,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold text-[#39496a] transition hover:bg-blue-50 hover:text-[#081432]"
    >
      <span className="flex items-center gap-3">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      {badge && <span className="rounded-md bg-[#edf1f7] px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#253452]">{badge}</span>}
    </Link>
  );
}
