"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  X, ChevronRight, ChevronLeft, Sparkles,
} from "lucide-react";

interface TourStep {
  /** CSS selector for the main element the tooltip points to (on the page content) */
  target: string;
  /** CSS selector for the sidebar link to highlight alongside */
  sidebarTarget: string;
  /** Route to navigate to when this step is active */
  href: string;
  title: string;
  description: string;
  placement: "right" | "bottom" | "top" | "left";
}

const TOUR_STEPS: TourStep[] = [
  {
    target: "#tour-dashboard",
    sidebarTarget: 'a[href="/dashboard"]',
    href: "/dashboard",
    title: "Your Dashboard",
    description:
      "Track your resume generation stats, job applications, credit usage, and subscription — all in one place.",
    placement: "bottom",
  },
  {
    target: "#tour-profile",
    sidebarTarget: 'a[href="/dashboard/profile"]',
    href: "/dashboard/profile",
    title: "Master Profile",
    description:
      "Build your master profile by filling in your details or uploading an existing resume. This data powers AI-tailored resume generation.",
    placement: "bottom",
  },
  {
    target: '[data-tour="ai-studio"]',
    sidebarTarget: 'a[href="/dashboard/generator"]',
    href: "/dashboard/generator",
    title: "Resume Generator",
    description:
      "Click the Resume Studio button next to any saved job to instantly generate a beautifully tailored resume.",
    placement: "left",
  },
  {
    target: "#tour-job-views",
    sidebarTarget: 'a[href="/dashboard/jobs"]',
    href: "/dashboard/jobs",
    title: "Job Tracker",
    description:
      "Switch between List and Board view to manage your applications. Add jobs manually or use the browser extension.",
    placement: "bottom",
  },
  {
    target: "#tour-ats-setup",
    sidebarTarget: 'a[href="/dashboard/ats-score"]',
    href: "/dashboard/ats-score",
    title: "ATS Score Checker",
    description:
      "Select a job description and your resume, then run the analysis to get a detailed keyword match report.",
    placement: "bottom",
  },
  {
    target: "#tour-download-ext",
    sidebarTarget: 'a[href="/dashboard/extension"]',
    href: "/dashboard/extension",
    title: "Browser Extension",
    description:
      "Click Download Extension to install the Chrome extension. It lets you autofill applications and save jobs from any site.",
    placement: "bottom",
  },
  {
    target: "#tour-credits",
    sidebarTarget: "#tour-credits",
    href: "/dashboard",
    title: "Your Credits",
    description:
      "Each resume generation uses 1 credit. Track your remaining credits here. Upgrade your plan anytime for more credits.",
    placement: "bottom",
  },
];

export function OnboardingTour() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentStep, setCurrentStep] = useState(0);
  const currentStepRef = useRef(0);
  const [isVisible, setIsVisible] = useState(false);
  const isVisibleRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [arrowPos, setArrowPos] = useState(0);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);
  const activePlacementRef = useRef<"right" | "bottom" | "top" | "left">("bottom");

  // Check server for onboarding status
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const res = await fetch("/api/user/onboarding");
        if (!res.ok) {
          setIsLoading(false);
          return;
        }
        const data = await res.json();
        if (!data.onboarding_done) {
          // Small delay so the dashboard has time to render
          setTimeout(() => {
            isVisibleRef.current = true;
            setIsVisible(true);
            setIsLoading(false);
            // Poll for the first step target element
            waitForElement(0);
          }, 800);
        } else {
          setIsLoading(false);
        }
      } catch {
        setIsLoading(false);
      }
    };
    checkOnboarding();
  }, []);

  // Position the tooltip next to the target element (reads from ref for latest step)
  const positionTooltip = useCallback(() => {
    if (!isVisibleRef.current) return false;

    const step = TOUR_STEPS[currentStepRef.current];
    const targetEl = document.querySelector(step.target) as HTMLElement;

    if (!targetEl) {
      return false;
    }

    // Scroll into view if target is off-screen
    const elRect = targetEl.getBoundingClientRect();
    if (elRect.bottom < 0 || elRect.top > window.innerHeight) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    const rect = targetEl.getBoundingClientRect();
    const tooltipEl = tooltipRef.current;
    const tooltipHeight = tooltipEl?.offsetHeight || 200;
    const tooltipWidth = 320;
    const gap = 14;
    const margin = 12; // min distance from viewport edge

    let top = 0;
    let left = 0;
    let arrow = 0;

    // Determine effective placement with auto-flip
    let placement = step.placement;

    if (placement === "bottom" && rect.bottom + gap + tooltipHeight > window.innerHeight - margin) {
      // Not enough space below — flip to top if there's room
      if (rect.top - gap - tooltipHeight >= margin) {
        placement = "top";
      }
    } else if (placement === "top" && rect.top - gap - tooltipHeight < margin) {
      // Not enough space above — flip to bottom if there's room
      if (rect.bottom + gap + tooltipHeight <= window.innerHeight - margin) {
        placement = "bottom";
      }
    } else if (placement === "right" && rect.right + gap + tooltipWidth > window.innerWidth - margin) {
      if (rect.left - gap - tooltipWidth >= margin) {
        placement = "left";
      }
    } else if (placement === "left" && rect.left - gap - tooltipWidth < margin) {
      if (rect.right + gap + tooltipWidth <= window.innerWidth - margin) {
        placement = "right";
      }
    }

    activePlacementRef.current = placement;

    if (placement === "right") {
      left = rect.right + gap;
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      arrow = tooltipHeight / 2 - 8;

      if (top < margin) { arrow += top - margin; top = margin; }
      if (top + tooltipHeight > window.innerHeight - margin) {
        const overflow = top + tooltipHeight - (window.innerHeight - margin);
        arrow += overflow;
        top -= overflow;
      }
    } else if (placement === "left") {
      left = rect.left - tooltipWidth - gap;
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      arrow = tooltipHeight / 2 - 8;

      if (top < margin) { arrow += top - margin; top = margin; }
      if (top + tooltipHeight > window.innerHeight - margin) {
        const overflow = top + tooltipHeight - (window.innerHeight - margin);
        arrow += overflow;
        top -= overflow;
      }
    } else if (placement === "bottom") {
      top = rect.bottom + gap;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      arrow = tooltipWidth / 2 - 8;

      if (left < margin) left = margin;
      if (left + tooltipWidth > window.innerWidth - margin) left = window.innerWidth - margin - tooltipWidth;
      // Final vertical clamp
      if (top + tooltipHeight > window.innerHeight - margin) {
        top = window.innerHeight - margin - tooltipHeight;
      }
    } else if (placement === "top") {
      top = rect.top - tooltipHeight - gap;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      arrow = tooltipWidth / 2 - 8;

      if (left < margin) left = margin;
      if (left + tooltipWidth > window.innerWidth - margin) left = window.innerWidth - margin - tooltipWidth;
      if (top < margin) top = margin;
    }

    setTooltipPos({ top, left });
    setArrowPos(arrow);
    setIsPositioned(true);
    return true;
  }, []); // uses refs so no state dependencies needed

  // Poll for the target element until it appears in the DOM
  const waitForElement = useCallback((stepIndex: number) => {
    let attempts = 0;
    const maxAttempts = 20; // 20 × 200ms = 4 seconds max

    const poll = () => {
      attempts++;
      const step = TOUR_STEPS[stepIndex];
      const el = document.querySelector(step.target);

      if (el) {
        setIsAnimating(false);
        positionTooltip();
        return;
      }

      if (attempts < maxAttempts) {
        setTimeout(poll, 200);
      } else {
        setIsAnimating(false);
      }
    };

    setTimeout(poll, 300);
  }, [positionTooltip]);

  useEffect(() => {
    positionTooltip();
    window.addEventListener("resize", positionTooltip);
    window.addEventListener("scroll", positionTooltip, true);
    return () => {
      window.removeEventListener("resize", positionTooltip);
      window.removeEventListener("scroll", positionTooltip, true);
    };
  }, [positionTooltip]);

  // Highlight the current target element + sidebar link
  useEffect(() => {
    if (!isVisible) return;
    const step = TOUR_STEPS[currentStep];

    let targetEl: HTMLElement | null = null;
    let sidebarEl: HTMLElement | null = null;

    const applyHighlight = (el: HTMLElement, thick: boolean) => {
      el.style.position = "relative";
      el.style.zIndex = "10001";
      el.style.boxShadow = thick
        ? "0 0 0 3px var(--primary), 0 0 20px rgba(34, 197, 94, 0.15)"
        : "0 0 0 2px var(--primary), 0 0 12px rgba(34, 197, 94, 0.1)";
      el.style.borderRadius = "8px";
      el.style.transition = "box-shadow 0.3s ease";
    };

    const clearStyle = (el: HTMLElement) => {
      el.style.zIndex = "";
      el.style.boxShadow = "";
      el.style.transition = "";
    };

    // Poll for elements (they may render late from async data)
    let hlAttempts = 0;
    const hlPoll = setInterval(() => {
      hlAttempts++;
      if (!targetEl) {
        targetEl = document.querySelector(step.target) as HTMLElement;
        if (targetEl) applyHighlight(targetEl, true);
      }
      if (!sidebarEl) {
        sidebarEl = document.querySelector(step.sidebarTarget) as HTMLElement;
        if (sidebarEl) applyHighlight(sidebarEl, false);
      }
      if ((targetEl && sidebarEl) || hlAttempts > 20) clearInterval(hlPoll);
    }, 200);

    // Immediate attempt
    targetEl = document.querySelector(step.target) as HTMLElement;
    sidebarEl = document.querySelector(step.sidebarTarget) as HTMLElement;
    if (targetEl) applyHighlight(targetEl, true);
    if (sidebarEl) applyHighlight(sidebarEl, false);

    return () => {
      clearInterval(hlPoll);
      if (targetEl) clearStyle(targetEl);
      if (sidebarEl) clearStyle(sidebarEl);
    };
  }, [currentStep, isVisible]);

  const goTo = (stepIdx: number) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setIsPositioned(false);
    currentStepRef.current = stepIdx;
    setCurrentStep(stepIdx);

    // Navigate to the step's page so it shows in the background
    const targetHref = TOUR_STEPS[stepIdx].href;
    if (pathname !== targetHref) {
      router.push(targetHref);
    }

    // Poll until the target element appears in the DOM
    waitForElement(stepIdx);
  };

  const next = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      goTo(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const prev = () => {
    if (currentStep > 0) {
      goTo(currentStep - 1);
    }
  };

  const completeTour = async () => {
    isVisibleRef.current = false;
    setIsVisible(false);
    // Navigate back to dashboard home
    router.push("/dashboard");
    // Persist to server DB
    try {
      await fetch("/api/user/onboarding", { method: "POST" });
    } catch {
      // Silently fail — user just won't see it again on this session anyway
    }
  };

  if (!isVisible || isLoading) return null;

  const step = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-[1px] transition-opacity duration-300"
        style={{ opacity: isVisible ? 1 : 0 }}
        onClick={completeTour}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[10002] animate-scale-in"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
          width: 320,
          opacity: isPositioned ? 1 : 0,
          transition: isPositioned
            ? "top 0.3s cubic-bezier(0.4,0,0.2,1), left 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease"
            : "none",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Arrow — uses activePlacement (may differ from step.placement due to auto-flip) */}
        {activePlacementRef.current === "right" && (
          <div
            className="absolute -left-[7px] w-3.5 h-3.5 rotate-45"
            style={{
              top: arrowPos,
              background: "var(--background, #0a0a0a)",
              borderLeft:
                "1px solid var(--border-color, rgba(255,255,255,0.1))",
              borderBottom:
                "1px solid var(--border-color, rgba(255,255,255,0.1))",
            }}
          />
        )}
        {activePlacementRef.current === "left" && (
          <div
            className="absolute -right-[7px] w-3.5 h-3.5 rotate-45"
            style={{
              top: arrowPos,
              background: "var(--background, #0a0a0a)",
              borderRight:
                "1px solid var(--border-color, rgba(255,255,255,0.1))",
              borderTop:
                "1px solid var(--border-color, rgba(255,255,255,0.1))",
            }}
          />
        )}
        {activePlacementRef.current === "bottom" && (
          <div
            className="absolute -top-[7px] w-3.5 h-3.5 rotate-45"
            style={{
              left: arrowPos,
              background: "var(--background, #0a0a0a)",
              borderLeft:
                "1px solid var(--border-color, rgba(255,255,255,0.1))",
              borderTop:
                "1px solid var(--border-color, rgba(255,255,255,0.1))",
            }}
          />
        )}
        {activePlacementRef.current === "top" && (
          <div
            className="absolute -bottom-[7px] w-3.5 h-3.5 rotate-45"
            style={{
              left: arrowPos,
              background: "var(--background, #0a0a0a)",
              borderRight:
                "1px solid var(--border-color, rgba(255,255,255,0.1))",
              borderBottom:
                "1px solid var(--border-color, rgba(255,255,255,0.1))",
            }}
          />
        )}

        {/* Card */}
        <div
          className="rounded-xl overflow-hidden shadow-2xl border border-[var(--border-color)]"
          style={{
            background: "var(--background, #0a0a0a)",
            boxShadow:
              "0 20px 60px -15px rgba(0,0,0,0.5), 0 0 30px rgba(34,197,94,0.05)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[var(--primary)]/15 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-[var(--primary)]" />
              </div>
              <span className="text-xs font-bold text-[var(--primary)] uppercase tracking-wider">
                {currentStep + 1} of {TOUR_STEPS.length}
              </span>
            </div>
            <button
              onClick={completeTour}
              className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--foreground)]/5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-4 pb-3">
            <h3 className="text-[15px] font-bold text-[var(--foreground)] mb-1.5 leading-tight">
              {step.title}
            </h3>
            <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-color)]">
            <button
              onClick={completeTour}
              className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors font-medium flex items-center gap-1 opacity-60 hover:opacity-100"
            >
              <span className="w-1 h-1 rounded-full bg-[var(--text-secondary)] opacity-50" />
              Hide these tips
            </button>

            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={prev}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--foreground)]/5 border border-[var(--border-color)] transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              )}
              <button
                onClick={next}
                className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-[12px] font-bold text-white transition-all shadow-md hover:shadow-lg hover:-translate-y-px"
                style={{
                  background:
                    "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary), black 20%))",
                  boxShadow: "0 2px 10px rgba(34, 197, 94, 0.25)",
                }}
              >
                {isLastStep ? "Finish" : "Next"}
                {!isLastStep && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 pb-3">
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="transition-all duration-300"
                style={{
                  width: i === currentStep ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  background:
                    i === currentStep
                      ? "var(--primary)"
                      : i < currentStep
                      ? "color-mix(in srgb, var(--primary) 40%, transparent)"
                      : "var(--foreground)",
                  opacity:
                    i === currentStep ? 1 : i < currentStep ? 0.6 : 0.15,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
