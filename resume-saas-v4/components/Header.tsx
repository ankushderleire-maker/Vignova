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
  ScanLine,
  Search,
  Chrome,
  Linkedin,
  MessageSquare,
  Menu,
  Bell,
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

export function Header({ onMenuClick }: HeaderProps) {
  let session: any = null;
  try {
    const sessionData = useSession();
    session = sessionData?.data;
  } catch {
    // SessionProvider may not be available during prerender
  }
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [unreadTickets, setUnreadTickets] = useState<any[]>([]);
  const [pushNotifications, setPushNotifications] = useState<any[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    // Fetch unread tickets and push notifications on load
    if (session?.user) {
      fetch("/api/tickets/unread")
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setUnreadTickets(data); })
        .catch(err => console.error("Failed to fetch unread tickets", err));

      fetch("/api/notifications")
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setPushNotifications(data); })
        .catch(err => console.error("Failed to fetch notifications", err));
    }
  }, [session?.user]);

  const dismissNotification = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await fetch(`/api/notifications/${notificationId}/dismiss`, { method: "POST" });
      setPushNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error("Failed to dismiss notification", err);
    }
  };

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
  const badgeBg = sub?.plan_type === "PREMIUM" ? "bg-amber-500/10 border-amber-500/30" : sub?.plan_type === "PRO" ? "bg-blue-500/10 border-blue-500/30" : "bg-white/10 border-white/20";
  const badgeText = sub?.plan_type === "PREMIUM" ? "text-amber-400" : sub?.plan_type === "PRO" ? "text-blue-400" : "text-gray-300";
  const planLabelColor = badgeText;

  // Close dropdown when clicking outside
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
    <header className="flex h-16 items-center justify-between border-b border-white/10 bg-[#000000] px-4 md:px-8 relative z-20">
      {/* Left side: Hamburger (mobile) + Icon + Page Title + Description */}
      <div className="flex items-center gap-2 md:gap-4 min-w-0 pr-2 md:pr-4">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="p-2 md:p-2.5 bg-blue-500/10 rounded-xl shrink-0 border border-blue-500/20">
          <Icon className="h-5 w-5 md:h-6 md:w-6 text-blue-400" />
        </div>
        <div className="min-w-0 flex flex-col justify-center">
          <h1 className="text-base md:text-xl font-bold text-white leading-tight tracking-tight truncate">{currentPage.title}</h1>
          <p className="text-xs text-gray-400 hidden md:block truncate mt-0.5">
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
      <div className="flex items-center gap-2 sm:gap-4 md:gap-6 shrink-0">

        {/* Notifications Bell */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadTickets.length > 0 && (
              <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#000000]" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {isNotificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 origin-top-right rounded-xl bg-[var(--sidebar-bg)] border border-[var(--border-color)] shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none animate-in fade-in zoom-in-95 duration-200">
              <div className="p-3 border-b border-[var(--border-color)]">
                <h3 className="font-semibold text-[var(--foreground)] text-sm">Notifications</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {unreadTickets.length === 0 ? (
                  <div className="p-4 text-center text-sm text-[var(--text-secondary)]">
                    No new notifications
                  </div>
                ) : (
                  <div className="p-1">
                    {unreadTickets.map(ticket => (
                      <Link
                        key={ticket.id}
                        href={`/dashboard/help/${ticket.id}`}
                        onClick={() => setIsNotificationsOpen(false)}
                        className="block p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                            <MessageSquare className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm text-[var(--foreground)] font-medium leading-tight mb-1">
                              You got a response on your ticket
                            </p>
                            <p className="text-xs text-[var(--text-secondary)] truncate w-48">
                              {ticket.subject}
                            </p>
                            <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                              {new Date(ticket.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Credits Counter */}
        <div id="tour-credits" className={`flex items-center gap-1.5 rounded-full px-2.5 md:px-4 py-1.5 border ${badgeBg}`}>
          <Zap className={`h-3.5 w-3.5 md:h-4 md:w-4 ${badgeText} fill-current`} />
          <span className={`text-xs md:text-sm font-semibold ${badgeText}`}>
            {isUnlimited ? "∞" : credits}
            <span className="hidden sm:inline"> Credits</span>
          </span>
        </div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 md:gap-3 pl-3 md:pl-6 border-l border-white/10 outline-none group"
          >
            <div className="text-right hidden sm:block group-hover:opacity-80 transition-opacity">
              <p className="text-sm font-medium text-white truncate max-w-[100px] md:max-w-none">
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
            <div className="absolute right-0 top-full mt-2 w-56 sm:w-64 origin-top-right rounded-xl bg-[var(--sidebar-bg)] border border-[var(--border-color)] shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none animate-in fade-in zoom-in-95 duration-200">
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
                  href="/dashboard/help"
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
