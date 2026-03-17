"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface UserModalProps {
    user: {
        id: string;
        email: string;
        fullName: string | null;
        role: string;
        subscription: {
            plan_type: string;
            credits_remaining: number;
        } | null;
    };
    onClose: () => void;
    onSave: (data: { role?: string; plan_type?: string; credits_remaining?: number }) => void;
    onDelete: () => void;
}

export function UserModal({ user, onClose, onSave, onDelete }: UserModalProps) {
    const [role, setRole] = useState(user.role);
    const [planType, setPlanType] = useState(user.subscription?.plan_type || "FREE");
    const [credits, setCredits] = useState(user.subscription?.credits_remaining ?? 3);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        await onSave({
            role,
            plan_type: planType,
            credits_remaining: credits,
        });
        setSaving(false);
    };

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
                <div className="p-6 space-y-5">
                    {/* Email (read-only) */}
                    <div>
                        <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Email</label>
                        <p className="mt-1 text-sm text-white">{user.email}</p>
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

                    {/* Credits */}
                    <div>
                        <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Credits Remaining</label>
                        <input
                            type="number"
                            value={credits}
                            onChange={(e) => setCredits(parseInt(e.target.value) || 0)}
                            min={0}
                            className="mt-1 w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                        />
                    </div>
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
