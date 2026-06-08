"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Plus, Rocket, SlidersHorizontal, X } from "lucide-react";

export type ExperienceLevel = "fresher" | "low" | "medium" | "high";

export type ScanFilterState = {
    positions: string[];
    locations: string[];
    experience: ExperienceLevel[];
    datePosted: "recent" | "week" | "month";
};

type ScanFiltersModalProps = {
    open: boolean;
    filters: ScanFilterState;
    onChange: (next: ScanFilterState) => void;
    onClose: () => void;
    onSubmit: () => void;
    submitting?: boolean;
};

const LOCATION_PRESETS = ["Remote", "Dublin, Ireland", "Delhi, India"] as const;
const EXPERIENCE_OPTIONS: { id: ExperienceLevel; label: string; hint: string }[] = [
    { id: "fresher", label: "Fresher", hint: "0-1 yrs" },
    { id: "low", label: "Low", hint: "1-3 yrs" },
    { id: "medium", label: "Medium", hint: "3-6 yrs" },
    { id: "high", label: "High", hint: "6+ yrs" },
];
const DATE_POSTED_OPTIONS: { id: ScanFilterState["datePosted"]; label: string; hint: string }[] = [
    { id: "recent", label: "Recent", hint: "Last 24h" },
    { id: "week", label: "Week", hint: "Last 7d" },
    { id: "month", label: "Month", hint: "Last 30d" },
];

function normalizeToken(value: string) {
    return value.replace(/\s+/g, " ").trim();
}

export function ScanFiltersModal({
    open,
    filters,
    onChange,
    onClose,
    onSubmit,
    submitting = false,
}: ScanFiltersModalProps) {
    const [positionInput, setPositionInput] = useState("");
    const [customLocationInput, setCustomLocationInput] = useState("");

    useEffect(() => {
        if (!open) return;
        const previousOverflow = document.body.style.overflow;
        const previousPadding = document.body.style.paddingRight;
        const scrollbarPx = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = "hidden";
        if (scrollbarPx > 0) {
            document.body.style.paddingRight = `${scrollbarPx}px`;
        }
        return () => {
            document.body.style.overflow = previousOverflow;
            document.body.style.paddingRight = previousPadding;
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    if (!open || typeof document === "undefined") {
        return null;
    }

    const addPosition = (value: string) => {
        const normalized = normalizeToken(value);
        if (!normalized || filters.positions.includes(normalized) || filters.positions.length >= 5) {
            return;
        }
        onChange({ ...filters, positions: [...filters.positions, normalized] });
        setPositionInput("");
    };

    const removePosition = (value: string) => {
        onChange({
            ...filters,
            positions: filters.positions.filter((item) => item !== value),
        });
    };

    const toggleLocation = (value: string) => {
        const exists = filters.locations.includes(value);
        onChange({
            ...filters,
            locations: exists
                ? filters.locations.filter((item) => item !== value)
                : [...filters.locations, value],
        });
    };

    const addCustomLocation = () => {
        const normalized = normalizeToken(customLocationInput);
        if (!normalized || filters.locations.includes(normalized)) {
            return;
        }
        onChange({ ...filters, locations: [...filters.locations, normalized] });
        setCustomLocationInput("");
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="scan-filters-title"
        >
            <div
                className="w-full max-w-2xl my-auto max-h-[92vh] overflow-y-auto rounded-2xl bg-[var(--background)] border border-[var(--border-color)] shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                            <SlidersHorizontal className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 id="scan-filters-title" className="text-sm font-bold text-[var(--foreground)]">
                                Job Scrapper Filters
                            </h2>
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                Pick target roles, locations, experience, and freshness.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--sidebar-bg)] transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                Positions
                            </label>
                            <span className="text-[11px] text-[var(--text-secondary)]">
                                {filters.positions.length}/5
                            </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mb-3">
                            Add up to 5 job titles to scan for.
                        </p>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {filters.positions.map((position) => (
                                <span
                                    key={position}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 text-xs font-semibold"
                                >
                                    {position}
                                    <button
                                        onClick={() => removePosition(position)}
                                        className="hover:bg-[var(--primary)]/20 rounded p-0.5"
                                        aria-label={`Remove ${position}`}
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={positionInput}
                                onChange={(event) => setPositionInput(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        addPosition(positionInput);
                                    }
                                }}
                                placeholder="Type a position and press Enter..."
                                disabled={filters.positions.length >= 5}
                                className="flex-1 px-3 py-2 bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--foreground)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20 transition-all disabled:opacity-50"
                            />
                            <button
                                onClick={() => addPosition(positionInput)}
                                disabled={!positionInput.trim() || filters.positions.length >= 5}
                                className="px-3 py-2 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 hover:bg-[var(--primary)]/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2 block">
                            Locations
                        </label>
                        <p className="text-xs text-[var(--text-secondary)] mb-3">
                            Pick one or more. Leave all unchecked to accept any location.
                        </p>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {LOCATION_PRESETS.map((location) => {
                                const selected = filters.locations.includes(location);
                                return (
                                    <button
                                        key={location}
                                        onClick={() => toggleLocation(location)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                                            selected
                                                ? "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/30"
                                                : "bg-[var(--sidebar-bg)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--primary)]/30"
                                        }`}
                                    >
                                        {selected && <Check className="w-3 h-3 inline mr-1" />}
                                        {location}
                                    </button>
                                );
                            })}
                            {filters.locations
                                .filter((location) => !(LOCATION_PRESETS as readonly string[]).includes(location))
                                .map((location) => (
                                    <span
                                        key={location}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30 text-xs font-semibold"
                                    >
                                        {location}
                                        <button
                                            onClick={() => toggleLocation(location)}
                                            className="hover:bg-[var(--primary)]/20 rounded p-0.5"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={customLocationInput}
                                onChange={(event) => setCustomLocationInput(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        addCustomLocation();
                                    }
                                }}
                                placeholder="Add a custom location..."
                                className="flex-1 px-3 py-2 bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--foreground)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20 transition-all"
                            />
                            <button
                                onClick={addCustomLocation}
                                disabled={!customLocationInput.trim()}
                                className="px-3 py-2 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 hover:bg-[var(--primary)]/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                Experience level
                            </label>
                            <span className="text-[11px] text-[var(--text-secondary)]">
                                Pick one or more
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {EXPERIENCE_OPTIONS.map((option) => {
                                const selected = filters.experience.includes(option.id);
                                return (
                                    <button
                                        key={option.id}
                                        onClick={() => {
                                            const exists = filters.experience.includes(option.id);
                                            const next = exists
                                                ? filters.experience.filter((item) => item !== option.id)
                                                : [...filters.experience, option.id];
                                            onChange({ ...filters, experience: next });
                                        }}
                                        className={`text-left px-3 py-2.5 rounded-lg border transition ${
                                            selected
                                                ? "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/30"
                                                : "bg-[var(--sidebar-bg)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--primary)]/30"
                                        }`}
                                        aria-pressed={selected}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            {selected && <Check className="w-3 h-3" />}
                                            <div className="text-sm font-bold">{option.label}</div>
                                        </div>
                                        <div className="text-[11px] opacity-70">{option.hint}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2 block">
                            Date posted
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {DATE_POSTED_OPTIONS.map((option) => {
                                const selected = filters.datePosted === option.id;
                                return (
                                    <button
                                        key={option.id}
                                        onClick={() => onChange({ ...filters, datePosted: option.id })}
                                        className={`text-left px-3 py-2.5 rounded-lg border transition ${
                                            selected
                                                ? "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/30"
                                                : "bg-[var(--sidebar-bg)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--primary)]/30"
                                        }`}
                                    >
                                        <div className="text-sm font-bold">{option.label}</div>
                                        <div className="text-[11px] opacity-70">{option.hint}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-[var(--border-color)] bg-[var(--sidebar-bg)]/50">
                    <p className="text-[11px] text-[var(--text-secondary)]">
                        The cooldown policy is applied after each run.
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] text-sm font-semibold hover:bg-[var(--sidebar-bg)] transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onSubmit}
                            disabled={filters.positions.length === 0 || submitting}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--background)] text-sm font-bold uppercase tracking-wider hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <Rocket className="w-4 h-4" />
                            {submitting ? "Starting..." : "Scan Jobs"}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
