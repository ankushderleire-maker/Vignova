"use client";

import { useState, useEffect } from "react";
import { Chrome, Download, Save, Check, LayoutTemplate, Dice5, ListChecks, AlertCircle } from "lucide-react";
import { AVAILABLE_TEMPLATES } from "@/components/resume-engine/templates";
import { TemplateThumbnail } from "@/components/resume-engine/TemplateThumbnail";
import Link from "next/link";

interface ExtensionSettings {
    mode: "specific" | "random" | "curated";
    templateId: string;
    templateIds: string[];
}

export default function ExtensionPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [subscription, setSubscription] = useState<any>(null);
    const [settings, setSettings] = useState<ExtensionSettings>({
        mode: "random",
        templateId: "classic",
        templateIds: [],
    });
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [subRes, settingsRes] = await Promise.all([
                fetch("/api/subscription"),
                fetch("/api/user/extension-settings"),
            ]);

            const subData = await subRes.json();
            setSubscription(subData);

            if (settingsRes.ok) {
                const settingsData = await settingsRes.json();
                // Merge with defaults
                setSettings((prev) => ({ ...prev, ...settingsData }));
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch("/api/user/extension-settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });

            if (res.ok) {
                setMessage({ type: "success", text: "Settings saved successfully!" });
                setTimeout(() => setMessage(null), 3000);
            } else {
                throw new Error("Failed to save");
            }
        } catch (error) {
            setMessage({ type: "error", text: "Failed to save details, please try again later." });
        } finally {
            setSaving(false);
        }
    };

    const toggleTemplate = (id: string) => {
        setSettings((prev) => {
            const current = prev.templateIds || [];
            const exists = current.includes(id);
            if (exists) {
                return { ...prev, templateIds: current.filter((t) => t !== id) };
            } else {
                return { ...prev, templateIds: [...current, id] };
            }
        });
    };

    if (loading) {
        return <div className="p-8 text-center">Loading...</div>;
    }

    const hasAccess = subscription?.has_extension_access || subscription?.plan_type === "PRO" || subscription?.plan_type === "PREMIUM";

    // Removed early block - we overlay the settings instead so they can download the extension

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-8 animate-fade-in">


            {/* Download Section */}
            <section className="bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-2">
                    <h3 className="text-xl font-semibold">Install Extension</h3>
                    <p className="text-sm text-[var(--foreground)]/70 max-w-xl">
                        Download the extension to integrate Vignova directly with LinkedIn and Indeed.
                        <br /><span className="text-xs opacity-70">Currently available for Chrome, Brave, and Edge.</span>
                    </p>
                </div>
                <a 
                    id="tour-download-ext" 
                    href="https://chromewebstore.google.com/detail/oalpfkabaipgcjimbcapeeaoipeikkha?utm_source=item-share-cb"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-[var(--primary)] text-white px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-all shadow-lg hover:shadow-[var(--primary)]/20 active:scale-95"
                >
                    <Download className="w-5 h-5" />
                    Install Browser Extension
                </a>
            </section>

            {/* Settings Section */}
            <section className="space-y-6 relative">
                {!hasAccess && (
                    <div className="absolute inset-0 z-10 backdrop-blur-[3px] bg-[var(--background)]/40 rounded-xl flex items-center justify-center border border-[var(--border-color)]">
                        <div className="bg-[var(--sidebar-bg)] border border-[var(--primary)]/30 rounded-xl p-8 text-center shadow-2xl max-w-sm mx-auto">
                            <div className="w-16 h-16 bg-[var(--primary)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Chrome className="w-8 h-8 text-[var(--primary)]" />
                            </div>
                            <h2 className="text-xl font-bold mb-3">Upgrade Plan to Unlock More</h2>
                            <p className="text-[var(--foreground)]/70 mb-6 text-sm">
                                Auto-tailoring resumes directly from LinkedIn and Indeed requires a Pro or Premium plan.
                            </p>
                            <Link href="/dashboard/billing" className="inline-block w-full bg-[var(--primary)] text-white px-6 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity">
                                Upgrade Plan
                            </Link>
                        </div>
                    </div>
                )}
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                        <LayoutTemplate className="w-5 h-5 text-[var(--primary)]" />
                        Resume Template Preferences
                    </h3>
                    {message && (
                        <div className={`text-sm px-3 py-1 rounded-md ${message.type === 'success' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                            {message.text}
                        </div>
                    )}
                </div>

                <div className="bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-xl p-6 space-y-8">
                    {/* Mode Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button
                            onClick={() => setSettings({ ...settings, mode: "specific" })}
                            className={`p-4 rounded-xl border-2 text-left transition-all space-y-2 ${settings.mode === "specific" ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border-color)] hover:border-[var(--foreground)]/30"}`}
                        >
                            <LayoutTemplate className={`w-6 h-6 ${settings.mode === "specific" ? "text-[var(--primary)]" : "text-[var(--foreground)]/50"}`} />
                            <div className="font-semibold">Specific Template</div>
                            <div className="text-xs text-[var(--foreground)]/60">Always use one specific template for every resume.</div>
                        </button>

                        <button
                            onClick={() => setSettings({ ...settings, mode: "random" })}
                            className={`p-4 rounded-xl border-2 text-left transition-all space-y-2 ${settings.mode === "random" ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border-color)] hover:border-[var(--foreground)]/30"}`}
                        >
                            <Dice5 className={`w-6 h-6 ${settings.mode === "random" ? "text-[var(--primary)]" : "text-[var(--foreground)]/50"}`} />
                            <div className="font-semibold">Completely Random</div>
                            <div className="text-xs text-[var(--foreground)]/60">Surprise me! Pick any available template randomly.</div>
                        </button>

                        <button
                            onClick={() => setSettings({ ...settings, mode: "curated" })}
                            className={`p-4 rounded-xl border-2 text-left transition-all space-y-2 ${settings.mode === "curated" ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border-color)] hover:border-[var(--foreground)]/30"}`}
                        >
                            <ListChecks className={`w-6 h-6 ${settings.mode === "curated" ? "text-[var(--primary)]" : "text-[var(--foreground)]/50"}`} />
                            <div className="font-semibold">Curated List</div>
                            <div className="text-xs text-[var(--foreground)]/60">Randomly select from a list of my favorite templates.</div>
                        </button>
                    </div>

                    <div className="h-px bg-[var(--border-color)]" />

                    {/* Configuration Area */}
                    {/* Configuration Area */}
                    <div>
                        {settings.mode === "specific" && (
                            <div className="space-y-4">
                                <h4 className="font-medium text-sm text-[var(--foreground)]/70 uppercase tracking-wider">Select Preferred Template</h4>
                                <div className="h-[600px] overflow-y-auto pr-2 border border-[var(--border-color)] rounded-lg p-4 bg-[var(--background)]/30">
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                        {AVAILABLE_TEMPLATES.map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => setSettings({ ...settings, templateId: t.id })}
                                                className={`group relative flex flex-col items-center text-center transition-all rounded-xl border-2 overflow-hidden ${settings.templateId === t.id ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/20 shadow-lg" : "border-[var(--border-color)] hover:border-[var(--foreground)]/30"}`}
                                            >
                                                <div className="w-full aspect-[210/297] bg-gray-100 relative">
                                                    <TemplateThumbnail templateId={t.id} />
                                                    {/* Selection Overlay */}
                                                    <div className={`absolute inset-0 bg-[var(--primary)]/10 transition-opacity ${settings.templateId === t.id ? "opacity-100" : "opacity-0 group-hover:opacity-10"}`} />
                                                </div>

                                                <div className="p-3 w-full bg-[var(--sidebar-bg)] border-t border-[var(--border-color)]">
                                                    <div className="font-semibold text-sm text-[var(--foreground)]">{t.name}</div>
                                                    <div className="text-[10px] text-[var(--foreground)]/60 capitalize">{t.type}</div>
                                                </div>

                                                {settings.templateId === t.id && (
                                                    <div className="absolute top-2 right-2 w-6 h-6 bg-[var(--primary)] rounded-full flex items-center justify-center shadow-md z-20">
                                                        <Check className="w-3.5 h-3.5 text-white" />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {settings.mode === "random" && (
                            <div className="text-center py-12 text-[var(--foreground)]/60 bg-[var(--background)]/50 rounded-xl border border-[var(--border-color)] border-dashed">
                                <Dice5 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <h4 className="text-lg font-semibold text-[var(--foreground)]">Feeling Lucky?</h4>
                                <p className="max-w-md mx-auto">We'll pick a fresh design for every job application! This is a great way to A/B test which resumes get more responses.</p>
                            </div>
                        )}

                        {settings.mode === "curated" && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-sm text-[var(--foreground)]/70 uppercase tracking-wider">Select Your Favorites</h4>
                                    <span className="text-xs px-2 py-1 bg-[var(--primary)]/10 text-[var(--primary)] rounded-md">
                                        {settings.templateIds?.length || 0} selected
                                    </span>
                                </div>
                                <p className="text-xs text-[var(--foreground)]/60 mb-4">Select at least 2 templates to rotate between.</p>

                                <div className="h-[600px] overflow-y-auto pr-2 border border-[var(--border-color)] rounded-lg p-4 bg-[var(--background)]/30">
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                        {AVAILABLE_TEMPLATES.map(t => {
                                            const isSelected = settings.templateIds?.includes(t.id);
                                            return (
                                                <button
                                                    key={t.id}
                                                    onClick={() => toggleTemplate(t.id)}
                                                    className={`group relative flex flex-col items-center text-center transition-all rounded-xl border-2 overflow-hidden ${isSelected ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/20 shadow-lg" : "border-[var(--border-color)] hover:border-[var(--foreground)]/30"}`}
                                                >
                                                    <div className="w-full aspect-[210/297] bg-gray-100 relative">
                                                        <TemplateThumbnail templateId={t.id} />
                                                        {/* Selection Overlay */}
                                                        <div className={`absolute inset-0 bg-[var(--primary)]/10 transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-10"}`} />
                                                    </div>

                                                    <div className="p-3 w-full bg-[var(--sidebar-bg)] border-t border-[var(--border-color)]">
                                                        <div className="font-semibold text-sm text-[var(--foreground)]">{t.name}</div>
                                                        <div className="text-[10px] text-[var(--foreground)]/60 capitalize">{t.type}</div>
                                                    </div>

                                                    {isSelected && (
                                                        <div className="absolute top-2 right-2 w-6 h-6 bg-[var(--primary)] rounded-full flex items-center justify-center shadow-md z-20">
                                                            <Check className="w-3.5 h-3.5 text-white" />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 bg-[var(--primary)] text-white px-8 py-3 rounded-lg font-bold hover:opacity-90 transition-all disabled:opacity-50"
                        >
                            {saving ? (
                                <>Saving...</>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Save Preferences
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
