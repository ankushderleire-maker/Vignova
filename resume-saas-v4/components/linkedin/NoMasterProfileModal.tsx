"use client";

import { UserCircle } from "lucide-react";

type Props = {
    open: boolean;
    hasProfiles: boolean;
    onCreate: () => void;
    onContinue: () => void;
    onCancel: () => void;
};

/**
 * Asked before a LinkedIn scan when there is no usable Master Profile.
 *
 * The analysis compares LinkedIn with the Master Profile. Starting a scan
 * without one used to produce LinkedIn-only scores and weaker suggestions
 * without saying why.
 */
export default function NoMasterProfileModal({ open, hasProfiles, onCreate, onContinue, onCancel }: Props) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="no-master-title"
                className="relative w-full max-w-md rounded-xl border border-[var(--border-color)] bg-[var(--sidebar-bg)] p-6 shadow-2xl animate-in zoom-in-95 duration-200"
            >
                <div className="flex flex-col items-center space-y-4 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                        <UserCircle className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 id="no-master-title" className="text-xl font-bold text-[var(--foreground)]">
                            Create your Master Profile first
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                            {hasProfiles ? "The selected Master Profile has no details yet." : "You have no Master Profile yet."}{" "}
                            The analysis compares your LinkedIn with it, so without one you only get LinkedIn-only
                            scores and weaker suggestions.
                        </p>
                    </div>
                    <div className="grid w-full grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                        <button onClick={onCreate} className="rounded-lg bg-[var(--primary)] px-4 py-2.5 font-medium text-white transition hover:opacity-90">
                            Create Master Profile
                        </button>
                        <button onClick={onContinue} className="rounded-lg bg-[var(--primary)]/10 px-4 py-2.5 font-medium text-[var(--primary)] transition hover:bg-[var(--primary)]/15">
                            Analyze LinkedIn only
                        </button>
                        <button onClick={onCancel} className="rounded-lg bg-[var(--card-border-bg)] px-4 py-2.5 font-medium text-[var(--foreground)] transition hover:bg-[var(--border-color)] sm:col-span-2">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
