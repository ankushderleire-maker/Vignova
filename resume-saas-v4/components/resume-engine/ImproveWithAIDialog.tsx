"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

export type SummaryVariant = { text: string; angle?: string };

/**
 * Offers several AI rewrites of a field and lets the user pick one, rather than
 * silently replacing what they wrote. Nothing is applied until "Use selected".
 */
export function ImproveWithAIDialog({
    open,
    title,
    subtitle,
    variants,
    loading,
    error,
    onRegenerate,
    onApply,
    onClose,
}: {
    open: boolean;
    title: string;
    subtitle: string;
    variants: SummaryVariant[];
    loading: boolean;
    error?: string | null;
    onRegenerate: () => void;
    onApply: (text: string) => void;
    onClose: () => void;
}) {
    const [selected, setSelected] = useState(0);

    // A fresh set of options shouldn't keep a stale selection.
    useEffect(() => setSelected(0), [variants]);

    if (!open) return null;

    return (
        <Modal
            open
            size="lg"
            title={title}
            onClose={onClose}
            header={
                <div className="min-w-0 flex gap-3">
                    <span className="w-10 h-10 shrink-0 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                        <Sparkles className="w-5 h-5" />
                    </span>
                    <div className="min-w-0">
                        <h3 className="text-lg font-bold text-[var(--foreground)]">{title}</h3>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">{subtitle}</p>
                    </div>
                </div>
            }
            footer={
                <div className="flex flex-col sm:flex-row justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="h-10 px-4 rounded-xl border border-[var(--border-color)] text-sm font-semibold text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onRegenerate}
                        disabled={loading}
                        className="h-10 px-4 rounded-xl border border-[var(--border-color)] text-sm font-semibold text-[var(--foreground)] flex items-center justify-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Regenerate
                    </button>
                    <button
                        onClick={() => variants[selected] && onApply(variants[selected].text)}
                        disabled={loading || !variants.length}
                        className="h-10 px-5 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
                    >
                        Use selected version
                    </button>
                </div>
            }
        >
            {error && (
                <div className="mb-4 flex gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed">{error}</p>
                </div>
            )}

            {loading && !variants.length ? (
                <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="rounded-xl border border-[var(--border-color)] p-4">
                            <div className="h-3 w-24 rounded bg-[var(--border-color)] mb-3 animate-pulse" />
                            <div className="space-y-2">
                                <div className="h-2.5 w-full rounded bg-[var(--border-color)] animate-pulse" />
                                <div className="h-2.5 w-11/12 rounded bg-[var(--border-color)] animate-pulse" />
                                <div className="h-2.5 w-3/4 rounded bg-[var(--border-color)] animate-pulse" />
                            </div>
                        </div>
                    ))}
                    <p className="text-xs text-[var(--text-secondary)] text-center pt-1">Writing options…</p>
                </div>
            ) : !variants.length ? (
                <p className="text-sm text-[var(--text-secondary)]">
                    No options were returned. Try Regenerate.
                </p>
            ) : (
                <div className={`space-y-3 ${loading ? "opacity-50 pointer-events-none" : ""}`}>
                    {variants.map((variant, i) => {
                        const active = selected === i;
                        return (
                            <button
                                key={i}
                                onClick={() => setSelected(i)}
                                className={`w-full text-left rounded-xl border p-4 transition ${
                                    active
                                        ? "border-[var(--primary)] bg-[var(--primary)]/5"
                                        : "border-[var(--border-color)] hover:border-[var(--primary)]/40"
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <span
                                        className={`mt-0.5 w-4 h-4 shrink-0 rounded-full border-[5px] transition ${
                                            active
                                                ? "border-[var(--primary)]"
                                                : "border-[var(--border-color)] bg-[var(--background)]"
                                        }`}
                                    />
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                            <span className="text-sm font-bold text-[var(--foreground)]">
                                                Version {i + 1}
                                            </span>
                                            {i === 0 && (
                                                <span className="px-2 py-0.5 rounded-full bg-[var(--primary)]/12 text-[var(--primary)] text-[10px] font-bold">
                                                    Recommended
                                                </span>
                                            )}
                                            {variant.angle && (
                                                <span className="text-[11px] text-[var(--text-secondary)]">
                                                    {variant.angle}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                                            {variant.text}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </Modal>
    );
}

export default ImproveWithAIDialog;
