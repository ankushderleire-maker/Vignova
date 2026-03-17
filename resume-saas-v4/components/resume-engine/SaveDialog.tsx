"use client";

import { useState } from "react";
import { Save, Copy, Loader2, X } from "lucide-react";

interface SaveDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSavePromise: (saveAsNew: boolean, name?: string) => Promise<void>;
    isExisting: boolean; // True if we are editing an already saved resume
    currentName?: string;
}

export default function SaveDialog({ isOpen, onClose, onSavePromise, isExisting, currentName = "" }: SaveDialogProps) {
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<"update" | "new">(isExisting ? "update" : "new");
    const [newName, setNewName] = useState(currentName || "My Resume");

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onSavePromise(mode === "new", newName);
            onClose();
        } catch (error) {
            console.error(error);
            alert("Failed to save");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#111] border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Save className="h-5 w-5 text-green-500" /> Save Resume
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-4 mb-6">
                    {/* OPTION 1: UPDATE EXISTING */}
                    {isExisting && (
                        <label className={`block p-4 border rounded-lg cursor-pointer transition-all ${mode === "update" ? "border-[var(--primary)] bg-[var(--primary)]/10" : "border-white/10 hover:border-white/30"}`}>
                            <div className="flex items-center gap-3">
                                <input
                                    type="radio"
                                    name="saveMode"
                                    checked={mode === "update"}
                                    onChange={() => setMode("update")}
                                    className="text-[var(--primary)] focus:ring-[var(--primary)]"
                                />
                                <div>
                                    <div className="font-bold text-white text-sm">Update Existing</div>
                                    <div className="text-xs text-gray-400">Overwrite the current version.</div>
                                </div>
                            </div>
                        </label>
                    )}

                    {/* OPTION 2: SAVE AS NEW */}
                    <label className={`block p-4 border rounded-lg cursor-pointer transition-all ${mode === "new" ? "border-[var(--primary)] bg-[var(--primary)]/10" : "border-white/10 hover:border-white/30"}`}>
                        <div className="flex items-center gap-3">
                            <input
                                type="radio"
                                name="saveMode"
                                checked={mode === "new"}
                                onChange={() => setMode("new")}
                                className="text-[var(--primary)] focus:ring-[var(--primary)]"
                            />
                            <div>
                                <div className="font-bold text-white text-sm">Save as New Version</div>
                                <div className="text-xs text-gray-400">Create a separate copy in your library.</div>
                            </div>
                        </div>
                    </label>

                    {/* NAME INPUT (Only for New) */}
                    {mode === "new" && (
                        <div className="pt-2">
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Resume Name</label>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full bg-black/50 border border-white/20 rounded px-3 py-2 text-sm text-white focus:border-[var(--primary)] outline-none"
                                placeholder="e.g. Software Engineer V2"
                            />
                        </div>
                    )}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 text-sm text-gray-400 hover:text-white transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="flex-1 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white font-bold py-2 rounded-lg text-sm transition-all shadow-[0_0_15px_rgba(var(--primary),0.3)] flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {mode === "update" ? "Update" : "Save Copy"}
                    </button>
                </div>
            </div>
        </div>
    );
}
