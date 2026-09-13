"use client";

import { useEffect, useState } from "react";
import { X, KeyRound, Ban, CheckCircle2 } from "lucide-react";

interface UserModalProps {
    user: {
        id: string;
        email: string;
        fullName: string | null;
        role: string;
        status?: string;
        subscription: {
            plan_type: string;
        } | null;
    };
    onClose: () => void;
    onSave: (data: {
        role?: string;
        status?: string;
        plan_type?: string;
        buckets?: Partial<Record<BucketName, number>>;
        reset_buckets?: boolean;
    }) => Promise<void> | void;
    onDelete: () => void;
}

const MAX_CREDITS = 100000;

const BUCKET_FIELDS = [
    { bucket: "tailoring", label: "Tailoring" },
    { bucket: "writing", label: "Writing" },
    { bucket: "interview", label: "Interview" },
] as const;

type BucketName = (typeof BUCKET_FIELDS)[number]["bucket"];
type Balance = { remaining: number; total: number; unlimited: boolean };

export function UserModal({ user, onClose, onSave, onDelete }: UserModalProps) {
    const [role, setRole] = useState(user.role);
    const [status, setStatus] = useState(user.status || "ACTIVE");
    const [planType, setPlanType] = useState(user.subscription?.plan_type || "FREE");
    // Credits are per bucket. This field used to edit the legacy
    // credits_remaining pool, which nothing spends from any more, so a saved
    // number changed nothing the user could see.
    const [balances, setBalances] = useState<Partial<Record<BucketName, Balance>>>({});
    const [edits, setEdits] = useState<Partial<Record<BucketName, number>>>({});
    const [refill, setRefill] = useState(false);
    const [creditsError, setCreditsError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetch(`/api/admin/users/${user.id}`)
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Could not load credit balances"))))
            .then((data) => {
                if (cancelled) return;
                const next: Partial<Record<BucketName, Balance>> = {};
                for (const row of data?.credits?.buckets ?? []) {
                    const field = BUCKET_FIELDS.find((f) => f.bucket === row.bucket);
                    if (field) next[field.bucket] = { remaining: row.remaining, total: row.total, unlimited: row.unlimited };
                }
                setBalances(next);
            })
            .catch((err: Error) => {
                if (!cancelled) setCreditsError(err.message);
            });
        return () => {
            cancelled = true;
        };
    }, [user.id]);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [sendingReset, setSendingReset] = useState(false);

    const handleSave = async () => {
        setError(null);
        const changed: Partial<Record<BucketName, number>> = {};
        for (const { bucket, label } of BUCKET_FIELDS) {
            const value = edits[bucket];
            if (value === undefined || value === balances[bucket]?.remaining) continue;
            if (!Number.isInteger(value) || value < 0 || value > MAX_CREDITS) {
                setError(`${label} credits must be a whole number between 0 and ${MAX_CREDITS}`);
                return;
            }
            changed[bucket] = value;
        }
        setSaving(true);
        try {
            await onSave({
                role,
                status,
                plan_type: planType,
                ...(refill
                    ? { reset_buckets: true }
                    : Object.keys(changed).length > 0
                      ? { buckets: changed }
                      : {}),
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    const handleSendReset = async () => {
        setSendingReset(true);
        setError(null);
        setNotice(null);
        try {
            const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
                method: "POST",
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to send reset email");
            setNotice(data.message || "Reset link sent");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to send reset email");
        } finally {
            setSendingReset(false);
        }
    };

    const suspended = status === "SUSPENDED";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h3 className="text-lg font-bold text-white">Edit User</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
                    {/* Email (read-only) */}
                    <div>
                        <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Email</label>
                        <p className="mt-1 text-sm text-white">{user.email}</p>
                    </div>

                    {/* Account status */}
                    <div>
                        <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Account Status</label>
                        <button
                            onClick={() => setStatus(suspended ? "ACTIVE" : "SUSPENDED")}
                            className={`mt-1 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-bold border transition-all ${
                                suspended
                                    ? "text-red-400 bg-red-400/10 border-red-500/30 hover:bg-red-400/20"
                                    : "text-green-400 bg-green-400/10 border-green-500/30 hover:bg-green-400/20"
                            }`}
                        >
                            {suspended ? (
                                <><Ban className="w-4 h-4" /> SUSPENDED — click to activate</>
                            ) : (
                                <><CheckCircle2 className="w-4 h-4" /> ACTIVE — click to suspend</>
                            )}
                        </button>
                        {suspended && (
                            <p className="mt-1 text-[11px] text-gray-500">
                                Suspended users cannot log in (password or Google/LinkedIn).
                            </p>
                        )}
                    </div>

                    {/* Role */}
                    <div>
                        <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Role</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="mt-1 w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                        >
                            <option value="USER">User</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                        {role === "ADMIN" && user.role !== "ADMIN" && (
                            <p className="mt-1 text-[11px] text-amber-400">
                                ⚠ This grants full admin panel access to this account.
                            </p>
                        )}
                    </div>

                    {/* Plan */}
                    <div>
                        <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Plan</label>
                        <select
                            value={planType}
                            onChange={(e) => setPlanType(e.target.value)}
                            className="mt-1 w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                        >
                            <option value="FREE">Free</option>
                            <option value="PRO">Pro</option>
                            <option value="PREMIUM">Premium</option>
                        </select>
                    </div>

                    {/* Credits, one balance per bucket */}
                    <div>
                        <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Credits Left This Month</label>
                        {creditsError ? (
                            <p className="mt-1 text-xs text-red-400">{creditsError}</p>
                        ) : (
                            <div className="mt-1 grid grid-cols-3 gap-2">
                                {BUCKET_FIELDS.map(({ bucket, label }) => {
                                    const balance = balances[bucket];
                                    return (
                                        <div key={bucket}>
                                            <span className="block text-[11px] text-gray-500 mb-1">{label}</span>
                                            <input
                                                type="number"
                                                value={edits[bucket] ?? balance?.remaining ?? ""}
                                                onChange={(e) => setEdits((prev) => ({ ...prev, [bucket]: parseInt(e.target.value, 10) || 0 }))}
                                                min={0}
                                                max={balance?.total ?? MAX_CREDITS}
                                                disabled={!balance || refill}
                                                className="w-full bg-zinc-800 border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-red-500/50 disabled:opacity-50"
                                            />
                                            <span className="block text-[11px] text-gray-500 mt-1">
                                                {balance ? (balance.unlimited ? "unlimited plan" : `of ${balance.total}`) : "loading..."}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <label className="mt-2 flex items-center gap-2 text-xs text-gray-300">
                            <input type="checkbox" checked={refill} onChange={(e) => setRefill(e.target.checked)} />
                            Refill every bucket to the plan allowance
                        </label>
                        <p className="mt-1 text-[11px] text-gray-500">
                            A balance cannot go above the plan allowance. Changing the plan adjusts the allowance first.
                        </p>
                    </div>

                    {/* Password reset */}
                    <div>
                        <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Password</label>
                        <button
                            onClick={handleSendReset}
                            disabled={sendingReset}
                            className="mt-1 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300 bg-zinc-800 border border-white/10 hover:bg-zinc-700 disabled:opacity-50 transition-all"
                        >
                            <KeyRound className="w-4 h-4" />
                            {sendingReset ? "Sending..." : "Email password reset link"}
                        </button>
                    </div>

                    {/* Feedback */}
                    {error && <p className="text-xs text-red-400">{error}</p>}
                    {notice && <p className="text-xs text-green-400">{notice}</p>}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
                    {!confirmDelete ? (
                        <button
                            onClick={() => setConfirmDelete(true)}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                            Delete User
                        </button>
                    ) : (
                        <button
                            onClick={onDelete}
                            className="text-xs text-red-500 font-bold animate-pulse"
                        >
                            ⚠ Confirm Delete? Click again
                        </button>
                    )}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-4 py-2 text-sm font-bold bg-red-500 text-white rounded-lg hover:bg-red-400 disabled:opacity-50 transition-all"
                        >
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
