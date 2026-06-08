"use client";

import { useCallback, useEffect, useState } from "react";
import {
    Chrome,
    Save,
    Loader2,
    AlertTriangle,
    CheckCircle2,
    Info,
    RefreshCw,
} from "lucide-react";

type ExtensionSettings = {
    extensionId: string;
    extensionVersion: string;
    extensionName: string;
    installUrl: string;
    updatedAt: string;
};

export default function AdminExtensionPage() {
    const [settings, setSettings]       = useState<ExtensionSettings | null>(null);
    const [loading, setLoading]         = useState(true);
    const [saving, setSaving]           = useState(false);
    const [error, setError]             = useState<string | null>(null);
    const [success, setSuccess]         = useState<string | null>(null);

    // Working copies
    const [extId,      setExtId]      = useState("");
    const [extVersion, setExtVersion] = useState("");
    const [extName,    setExtName]    = useState("");
    const [installUrl, setInstallUrl] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/extension-settings", { cache: "no-store" });
            if (!res.ok) throw new Error((await res.json()).error || "Load failed");
            const data: ExtensionSettings = await res.json();
            setSettings(data);
            setExtId(data.extensionId);
            setExtVersion(data.extensionVersion);
            setExtName(data.extensionName);
            setInstallUrl(data.installUrl);
        } catch (e: any) {
            setError(e?.message || "Failed to load settings");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const save = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await fetch("/api/admin/extension-settings", {
                method:  "PUT",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                    extensionId:      extId.trim(),
                    extensionVersion: extVersion.trim(),
                    extensionName:    extName.trim(),
                    installUrl:       installUrl.trim(),
                }),
            });
            if (!res.ok) throw new Error((await res.json()).error || "Save failed");
            const data: ExtensionSettings = await res.json();
            setSettings(data);
            setSuccess("Saved successfully.");
            setTimeout(() => setSuccess(null), 3000);
        } catch (e: any) {
            setError(e?.message || "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    const fmtDate = (iso: string) => new Date(iso).toLocaleString();

    const isDirty =
        settings !== null && (
            extId      !== settings.extensionId      ||
            extVersion !== settings.extensionVersion ||
            extName    !== settings.extensionName    ||
            installUrl !== settings.installUrl
        );

    return (
        <div className="max-w-3xl mx-auto space-y-8">

            {/* Page header */}
            <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <Chrome className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Extension Settings</h1>
                    <p className="text-sm text-gray-400 mt-1 max-w-2xl">
                        Set the Chrome Extension ID and current version. The user dashboard reads
                        these to verify the correct extension is installed and to prompt users
                        to update when a new version is released.
                    </p>
                </div>
            </div>

            {/* How it works */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/15 text-sm text-blue-300">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-400" />
                <div className="space-y-1">
                    <p className="font-semibold text-blue-200">How this works</p>
                    <ul className="list-disc list-inside text-xs text-blue-300/80 space-y-1">
                        <li>The browser extension sends its ID and version in the ping response.</li>
                        <li>If the <span className="font-mono">Extension ID</span> doesn't match, the dashboard shows "Extension not found".</li>
                        <li>If the <span className="font-mono">Extension Version</span> is behind the value here, users see an "Update available" banner.</li>
                        <li>Leave <span className="font-mono">Extension ID</span> blank to skip ID verification (version-only check).</li>
                    </ul>
                </div>
            </div>

            {/* Settings card */}
            <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6 space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                        Extension Configuration
                    </h2>
                    <button
                        onClick={load}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 text-gray-400 text-xs hover:text-white hover:border-white/20 transition"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-sm text-amber-400 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}

                <div className="space-y-5">
                    {/* Extension ID */}
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                            Extension ID
                        </label>
                        <input
                            type="text"
                            value={extId}
                            onChange={(e) => setExtId(e.target.value)}
                            placeholder="e.g. abcdefghijklmnopqrstuvwxyz123456"
                            className="w-full px-3 py-2.5 bg-zinc-900 border border-white/10 rounded-lg text-sm text-white font-mono placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50"
                        />
                        <p className="text-[11px] text-gray-500 mt-1.5">
                            Found in chrome://extensions — the 32-character ID of your published extension.
                            Leave blank to skip ID matching.
                        </p>
                    </div>

                    {/* Extension Version */}
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                            Current Version <span className="text-blue-400 normal-case">(required)</span>
                        </label>
                        <input
                            type="text"
                            value={extVersion}
                            onChange={(e) => setExtVersion(e.target.value)}
                            placeholder="e.g. 2.0.0"
                            className="w-full px-3 py-2.5 bg-zinc-900 border border-white/10 rounded-lg text-sm text-white font-mono placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50"
                        />
                        <p className="text-[11px] text-gray-500 mt-1.5">
                            Bump this whenever you publish a new extension version. Users with an older
                            version will see an "Update your extension" notification on the LinkedIn
                            Optimizer page.
                        </p>
                    </div>

                    {/* Extension Name */}
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                            Display Name
                        </label>
                        <input
                            type="text"
                            value={extName}
                            onChange={(e) => setExtName(e.target.value)}
                            placeholder="e.g. Vignova Extension"
                            className="w-full px-3 py-2.5 bg-zinc-900 border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50"
                        />
                        <p className="text-[11px] text-gray-500 mt-1.5">
                            Shown in the install and update prompts on the dashboard.
                        </p>
                    </div>

                    {/* Install URL */}
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                            Install URL
                        </label>
                        <input
                            type="text"
                            value={installUrl}
                            onChange={(e) => setInstallUrl(e.target.value)}
                            placeholder="e.g. https://chromewebstore.google.com/detail/..."
                            className="w-full px-3 py-2.5 bg-zinc-900 border border-white/10 rounded-lg text-sm text-white font-mono placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50"
                        />
                        <p className="text-[11px] text-gray-500 mt-1.5">
                            Chrome Web Store URL users are sent to when the extension is not detected.
                            Defaults to /dashboard/extension if left blank.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5">
                    <div className="text-xs text-gray-500">
                        {settings?.updatedAt && <>Last updated {fmtDate(settings.updatedAt)}</>}
                    </div>
                    <div className="flex items-center gap-3">
                        {success && (
                            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {success}
                            </span>
                        )}
                        <button
                            onClick={save}
                            disabled={saving || loading || !isDirty}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold uppercase tracking-wider hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Settings
                        </button>
                    </div>
                </div>
            </section>

            {/* Live preview */}
            {settings && (
                <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6 space-y-4">
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                        Current Saved Values
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {[
                            { label: "Extension ID",      value: settings.extensionId      || "(not set — ID check disabled)" },
                            { label: "Current Version",   value: settings.extensionVersion },
                            { label: "Display Name",      value: settings.extensionName    || "(not set)" },
                            { label: "Install URL",       value: settings.installUrl       || "(defaults to /dashboard/extension)" },
                        ].map(({ label, value }) => (
                            <div key={label} className="space-y-1">
                                <div className="text-gray-500 uppercase tracking-wider text-[10px] font-bold">{label}</div>
                                <div className="font-mono text-gray-200 break-all">{value}</div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
