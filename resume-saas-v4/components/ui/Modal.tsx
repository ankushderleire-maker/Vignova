"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * A centred overlay that is always positioned against the viewport.
 *
 * It renders through a portal on `document.body` on purpose. `position: fixed`
 * is only viewport-relative while no ancestor establishes a containing block,
 * and an ancestor with a `transform`, `filter`, `perspective`, `contain` or
 * `will-change` does establish one — at which point the overlay is measured
 * against that (usually very tall) element and the user has to scroll to find
 * it. Our page wrappers animate in, so they hit exactly that case. Portalling
 * sidesteps the whole class of problem no matter what a page does above it.
 *
 * Also handles Escape, backdrop click, and locking background scroll.
 */
export function Modal({
    open,
    title,
    subtitle,
    header,
    onClose,
    children,
    footer,
    size = "lg",
}: {
    open: boolean;
    /** Used for the default header, and as the dialog's accessible name. */
    title: string;
    subtitle?: string;
    /** Replaces the default title block; the close button stays. */
    header?: React.ReactNode;
    onClose: () => void;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: "md" | "lg" | "xl";
}) {
    useEffect(() => {
        if (!open) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [open, onClose]);

    if (!open || typeof document === "undefined") return null;

    const width = size === "md" ? "max-w-xl" : size === "xl" ? "max-w-4xl" : "max-w-2xl";

    return createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            />

            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={`relative w-full ${width} max-h-[85vh] flex flex-col rounded-2xl border border-[var(--border-color)] bg-[var(--background)] shadow-2xl`}
            >
                <div className="flex items-start justify-between gap-4 p-5 border-b border-[var(--border-color)]">
                    {header ?? (
                        <div className="min-w-0">
                            <h3 className="text-base font-bold text-[var(--foreground)] truncate">{title}</h3>
                            {subtitle && (
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{subtitle}</p>
                            )}
                        </div>
                    )}
                    <button
                        onClick={onClose}
                        aria-label="Close dialog"
                        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10 transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="overflow-y-auto p-5">{children}</div>

                {footer && <div className="border-t border-[var(--border-color)] p-4">{footer}</div>}
            </div>
        </div>,
        document.body
    );
}

export default Modal;
