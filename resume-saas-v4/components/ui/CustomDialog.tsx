"use client";

import React, { useEffect } from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2, Trash2, X } from "lucide-react";

interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void;
    title: string;
    description: string | React.ReactNode;
    type?: "alert" | "confirm";
    variant?: "default" | "destructive" | "success";
    confirmText?: string;
    cancelText?: string;
    loading?: boolean;
    autoCloseMs?: number;
}

const variantMap = {
    default: {
        icon: Info,
        iconClass: "text-amber-500",
        iconWrap: "bg-amber-50 ring-1 ring-amber-100",
        confirmClass: "bg-amber-500 text-white hover:bg-amber-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]",
    },
    destructive: {
        icon: Trash2,
        iconClass: "text-rose-500",
        iconWrap: "bg-rose-50 ring-1 ring-rose-100",
        confirmClass: "bg-rose-500 text-white hover:bg-rose-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]",
    },
    success: {
        icon: CheckCircle2,
        iconClass: "text-emerald-500",
        iconWrap: "bg-emerald-50 ring-1 ring-emerald-100",
        confirmClass: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]",
    },
} as const;

export function CustomDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    type = "alert",
    variant = "default",
    confirmText = "Confirm",
    cancelText = "Cancel",
    loading = false,
    autoCloseMs,
}: DialogProps) {
    useEffect(() => {
        if (!isOpen) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !loading) onClose();
        };

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKeyDown);

        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [isOpen, loading, onClose]);

    useEffect(() => {
        if (!isOpen || loading || type !== "alert") return;
        const dismissAfter = autoCloseMs ?? (variant === "success" ? 1800 : undefined);
        if (!dismissAfter) return;

        const timer = window.setTimeout(() => onClose(), dismissAfter);
        return () => window.clearTimeout(timer);
    }, [autoCloseMs, isOpen, loading, onClose, type, variant]);

    if (!isOpen) return null;

    const current = variantMap[variant];
    const Icon = current.icon;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Close dialog"
                className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
                onClick={!loading ? onClose : undefined}
            />

            <div className="relative w-full max-w-[370px] rounded-2xl border border-black/8 bg-white px-7 pb-7 pt-8 text-center shadow-[0_18px_45px_-20px_rgba(15,23,42,0.25)] dark:border-white/10 dark:bg-[#111418] dark:shadow-[0_20px_50px_-22px_rgba(0,0,0,0.6)]">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-black/12 bg-white text-slate-500 transition hover:text-slate-800 disabled:opacity-50 dark:border-white/12 dark:bg-[#1a1f26] dark:text-slate-400 dark:hover:text-slate-200"
                >
                    <X className="h-3.5 w-3.5" />
                </button>

                <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${current.iconWrap} dark:bg-white/5 dark:ring-white/10`}>
                    <Icon className={`h-7 w-7 ${current.iconClass}`} />
                </div>

                <h3 className="mt-6 text-[2rem] font-semibold leading-none tracking-[-0.03em] text-slate-900 dark:text-white">
                    {title}
                </h3>

                <div className="mx-auto mt-3 max-w-[250px] text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {description}
                </div>

                <div className={`mt-8 grid gap-3 ${type === "confirm" ? "grid-cols-2" : "grid-cols-1"}`}>
                    {type === "confirm" && (
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-100 px-4 text-sm font-medium text-slate-900 transition hover:bg-slate-200 disabled:opacity-50 dark:bg-white/8 dark:text-white dark:hover:bg-white/12"
                        >
                            {cancelText}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => {
                            if (onConfirm) onConfirm();
                            if (type === "alert" && !loading) onClose();
                        }}
                        disabled={loading}
                        className={`inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-medium transition ${current.confirmClass} disabled:opacity-60`}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Working
                            </>
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
