"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Chrome,
  FileText,
  LayoutDashboard,
  Linkedin,
  MessageSquare,
  PartyPopper,
  ScanLine,
  Sparkles,
  UserRound,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Dispatched on window by the header menu's "Take the product tour". */
export const START_TOUR_EVENT = "vignova:start-tour";

interface TourStep {
  /** Selectors tried in order; the first visible match is spotlighted. */
  targets: string[];
  /** The page the step lives on. The tour navigates there itself. */
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    targets: ["#tour-dashboard"],
    href: "/dashboard",
    icon: LayoutDashboard,
    title: "Your dashboard",
    description: "Applications, resumes and interviews at a glance. Everything you do in Vignova rolls up here.",
  },
  {
    targets: ["#tour-credits"],
    href: "/dashboard",
    icon: Zap,
    title: "Your monthly credits",
    description:
      "Tailoring credits make resumes, writing credits cover letters, emails and LinkedIn rewrites, and interview credits question sets. Click this chip any time to see what is left.",
  },
  {
    targets: ["#tour-profile"],
    href: "/dashboard/profile",
    icon: UserRound,
    title: "Start with your Master Profile",
    description:
      "Upload your current resume or fill it in once. Every tailored resume, cover letter and LinkedIn rewrite is written from these facts.",
  },
  {
    targets: ["#tour-job-views", "#tour-add-job"],
    href: "/dashboard/jobs",
    icon: Briefcase,
    title: "Track every application",
    description: "Save jobs from any site with the extension or add them here, then move them from Saved to Offer.",
  },
  {
    targets: ['[data-tour="ai-studio"]', "#tour-generator"],
    href: "/dashboard/generator",
    icon: FileText,
    title: "Generate a tailored resume",
    description: "Pick a saved job and open Resume Studio for a resume, cover letter and email matched to that posting.",
  },
  {
    targets: ["#tour-ats-setup"],
    href: "/dashboard/ats-score",
    icon: ScanLine,
    title: "Check your ATS score",
    description: "Choose a job and a resume to see which keywords are covered and what to fix before you apply.",
  },
  {
    targets: ["#tour-linkedin"],
    href: "/dashboard/linkedin-optimizer",
    icon: Linkedin,
    title: "Optimize your LinkedIn",
    description: "Paste your profile URL. We score it against your Master Profile and rewrite each section for you to copy across.",
  },
  {
    targets: ["#tour-interview"],
    href: "/dashboard/interview-prep",
    icon: MessageSquare,
    title: "Prepare for interviews",
    description: "Generate questions for a specific job, with tips on how to answer each one.",
  },
  {
    targets: ["#tour-download-ext"],
    href: "/dashboard/extension",
    icon: Chrome,
    title: "Install the Chrome extension",
    description: "Score and tailor straight from LinkedIn and Indeed job pages, and save jobs to your tracker in one click.",
  },
];

const CARD_WIDTH = 340;
/** Card height used for placement; real cards are within a few pixels of it. */
const CARD_HEIGHT = 236;
/** How long a page gets to render a step's element before that step is skipped. */
const FIND_TIMEOUT_MS = 8000;
/** An element that is on the page but hidden at this screen size is skipped sooner. */
const HIDDEN_GRACE_MS = 1500;
const SNOOZE_KEY = "vignova_tour_snoozed";

type Phase = "hidden" | "welcome" | "step" | "done";
type Box = { top: number; left: number; width: number; height: number };

function findTarget(step: TourStep): HTMLElement | null {
  for (const selector of step.targets) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el && el.getClientRects().length > 0) return el;
  }
  return null;
}

function markDone() {
  // The tour is optional: failing to record it only means it is offered again.
  fetch("/api/user/onboarding", { method: "POST" }).catch(() => {});
}

/** Below the element, above it when there is no room, otherwise level with its middle. */
function placeCard(box: Box) {
  const width = Math.min(CARD_WIDTH, window.innerWidth - 24);
  const gap = 14;
  const margin = 12;
  let top = box.top + box.height + gap;
  if (top + CARD_HEIGHT > window.innerHeight - margin) top = box.top - CARD_HEIGHT - gap;
  if (top < margin) {
    top = Math.min(Math.max(margin, box.top + box.height / 2 - CARD_HEIGHT / 2), window.innerHeight - CARD_HEIGHT - margin);
  }
  const left = Math.max(margin, Math.min(box.left + box.width / 2 - width / 2, window.innerWidth - width - margin));
  return { top, left, width };
}

/**
 * The first-run product tour.
 *
 * New users never saw the previous one. It looked for the first step's element
 * on whatever page they landed on, and when it was not there it left a dimmed
 * screen with an invisible card, where one click on the backdrop marked the
 * tour finished for good. This one opens with a welcome card, walks to each
 * step's page itself, skips a step whose element never appears, and only ends
 * when someone ends it.
 */
export function OnboardingTour() {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("hidden");
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  /** Which way a step with nothing to show is skipped. */
  const forwardRef = useRef(true);
  const step = TOUR_STEPS[index];
  const isLast = index === TOUR_STEPS.length - 1;

  // First visit: offer the tour instead of starting it on top of the page.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = async () => {
      try {
        if (sessionStorage.getItem(SNOOZE_KEY)) return;
      } catch {
        // Storage can be blocked; ask anyway.
      }
      try {
        const res = await fetch("/api/user/onboarding");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && !data.onboarding_done) {
          timer = setTimeout(() => setPhase((current) => (current === "hidden" ? "welcome" : current)), 700);
        }
      } catch {
        // Offline or signed out: no tour.
      }
    };
    void check();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const goTo = useCallback((next: number) => {
    targetRef.current = null;
    setBox(null);
    setIndex(next);
  }, []);

  const start = useCallback(() => {
    forwardRef.current = true;
    goTo(0);
    setPhase("step");
  }, [goTo]);

  // Replay from the header menu.
  useEffect(() => {
    window.addEventListener(START_TOUR_EVENT, start);
    return () => window.removeEventListener(START_TOUR_EVENT, start);
  }, [start]);

  const close = useCallback(() => {
    targetRef.current = null;
    setBox(null);
    setPhase("hidden");
    markDone();
  }, []);

  const snooze = useCallback(() => {
    try {
      sessionStorage.setItem(SNOOZE_KEY, "1");
    } catch {
      // Nowhere to remember it; it is offered again next visit.
    }
    targetRef.current = null;
    setBox(null);
    setPhase("hidden");
  }, []);

  const next = useCallback(() => {
    forwardRef.current = true;
    if (isLast) {
      setBox(null);
      setPhase("done");
    } else {
      goTo(index + 1);
    }
  }, [goTo, index, isLast]);

  const back = useCallback(() => {
    forwardRef.current = false;
    goTo(Math.max(0, index - 1));
  }, [goTo, index]);

  const measure = useCallback(() => {
    const el = targetRef.current;
    if (!el || !el.isConnected) return;
    const r = el.getBoundingClientRect();
    const pad = 8;
    const area = { top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 };
    // Runs on a timer too, so keep the old box when nothing moved.
    setBox((prev) =>
      prev && prev.top === area.top && prev.left === area.left && prev.width === area.width && prev.height === area.height
        ? prev
        : area,
    );
  }, []);

  // Walk to the step's page, then wait for its element to render.
  useEffect(() => {
    if (phase !== "step") return;
    const current = TOUR_STEPS[index];
    if (pathname !== current.href) {
      router.push(current.href);
      return; // runs again once the route has changed
    }

    const started = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    const poll = () => {
      const el = findTarget(current);
      if (el) {
        targetRef.current = el;
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        timer = setTimeout(measure, 380);
        return;
      }
      const waited = Date.now() - started;
      const hiddenHere = current.targets.some((selector) => document.querySelector(selector));
      if (waited > FIND_TIMEOUT_MS || (hiddenHere && waited > HIDDEN_GRACE_MS)) {
        // A page without this step's element (no saved jobs yet, or a layout
        // that hides it) moves on instead of stranding the user on a dimmed
        // screen, in the direction the user was going.
        if (!forwardRef.current && index > 0) setIndex(index - 1);
        else if (index >= TOUR_STEPS.length - 1) setPhase("done");
        else setIndex(index + 1);
        return;
      }
      timer = setTimeout(poll, 200);
    };
    timer = setTimeout(poll, 250);
    return () => clearTimeout(timer);
  }, [phase, index, pathname, router, measure]);

  // Follow the element through scrolling, resizing and late layout shifts.
  useEffect(() => {
    if (phase !== "step") return;
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const tick = setInterval(measure, 500);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      clearInterval(tick);
    };
  }, [phase, measure]);

  useEffect(() => {
    if (phase === "hidden") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") snooze();
      else if (phase === "step" && event.key === "ArrowRight") next();
      else if (phase === "step" && event.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, next, back, snooze]);

  if (phase === "hidden") return null;

  if (phase === "welcome" || phase === "done") {
    const done = phase === "done";
    return (
      <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-intro-title"
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--sidebar-bg)] shadow-2xl animate-scale-in"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-[var(--primary)]/20 to-transparent" />
          <div className="relative px-7 pb-6 pt-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-lg">
              {done ? <PartyPopper className="h-8 w-8" /> : <Sparkles className="h-8 w-8" />}
            </div>
            <h2 id="tour-intro-title" className="text-2xl font-bold text-[var(--foreground)]">
              {done ? "You're all set" : "Welcome to Vignova"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              {done
                ? "Start with your Master Profile. Every resume, cover letter and LinkedIn rewrite is written from it."
                : `A quick ${TOUR_STEPS.length}-stop tour of the tools that take you from a job post to an interview. It takes about a minute.`}
            </p>
            {!done && (
              <ul className="mt-5 space-y-2 text-left">
                {TOUR_STEPS.slice(2, 7).map((item) => (
                  <li
                    key={item.title}
                    className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--background)]/60 px-3 py-2 text-[13px] text-[var(--foreground)]"
                  >
                    <item.icon className="h-4 w-4 shrink-0 text-[var(--primary)]" />
                    {item.title}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="relative flex flex-col gap-3 border-t border-[var(--border-color)] px-7 py-5">
            {done ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    close();
                    router.push("/dashboard/profile");
                  }}
                  className="w-full rounded-xl bg-[var(--primary)] py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
                >
                  Set up my Master Profile
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="w-full rounded-xl border border-[var(--border-color)] py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Finish
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={start}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--primary)] py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
                >
                  Start the tour <ChevronRight className="h-4 w-4" />
                </button>
                <div className="flex items-center justify-between text-xs font-medium">
                  <button type="button" onClick={snooze} className="text-[var(--text-secondary)] transition hover:text-[var(--foreground)]">
                    Maybe later
                  </button>
                  <button type="button" onClick={close} className="text-[var(--text-secondary)] transition hover:text-[var(--foreground)]">
                    Don&apos;t show this again
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const Icon = step.icon;
  const card = box ? placeCard(box) : null;

  return (
    <>
      {/* Holds clicks so the page underneath cannot end or navigate away from the tour by accident. */}
      <div className="fixed inset-0 z-[10000]" aria-hidden="true" />
      {box ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[10001] rounded-xl transition-[top,left,width,height] duration-300 ease-out"
          style={{
            top: box.top,
            left: box.left,
            width: box.width,
            height: box.height,
            boxShadow:
              "0 0 0 9999px rgba(6, 4, 18, 0.62), 0 0 0 2px var(--primary), 0 0 28px 4px color-mix(in srgb, var(--primary) 35%, transparent)",
          }}
        />
      ) : (
        <div aria-hidden="true" className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/55">
          <span className="rounded-full bg-[var(--sidebar-bg)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] shadow-lg">
            Opening {step.title.toLowerCase()}...
          </span>
        </div>
      )}
      {card && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-step-title"
          className="fixed z-[10002] overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--background)] shadow-2xl animate-scale-in transition-[top,left] duration-300"
          style={{ top: card.top, left: card.left, width: card.width }}
        >
          <div className="h-1 bg-[var(--border-color)]">
            <div
              className="h-full bg-[var(--primary)] transition-[width] duration-300"
              style={{ width: `${((index + 1) / TOUR_STEPS.length) * 100}%` }}
            />
          </div>
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/15 text-[var(--primary)]">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--primary)]">
                  Step {index + 1} of {TOUR_STEPS.length}
                </span>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="End the tour"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-secondary)] transition hover:bg-black/5 hover:text-[var(--foreground)] dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <h3 id="tour-step-title" className="mt-3 text-base font-bold text-[var(--foreground)]">
              {step.title}
            </h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">{step.description}</p>
          </div>
          <div className="flex items-center justify-between border-t border-[var(--border-color)] px-5 py-3">
            <button type="button" onClick={close} className="text-xs font-medium text-[var(--text-secondary)] transition hover:text-[var(--foreground)]">
              Skip tour
            </button>
            <div className="flex items-center gap-2">
              {index > 0 && (
                <button
                  type="button"
                  onClick={back}
                  className="flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--foreground)]"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Back
                </button>
              )}
              <button
                type="button"
                onClick={next}
                className="flex items-center gap-1 rounded-lg bg-[var(--primary)] px-4 py-1.5 text-xs font-bold text-white shadow-md transition hover:opacity-90"
              >
                {isLast ? "Finish" : "Next"}
                {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
