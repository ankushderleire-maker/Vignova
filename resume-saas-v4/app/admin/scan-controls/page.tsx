"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Shield,
    Save,
    Loader2,
    Search,
    UserX,
    UserCheck,
    Clock,
    AlertTriangle,
    Undo2,
    Power,
    PowerOff,
    Play,
    Copy,
    CheckCircle2,
    RefreshCw,
    Database,
} from "lucide-react";

type GlobalSettings = {
    cooldownHoursDefault: number;
    scanEnabled: boolean;
    scanDisabledReason: string | null;
    updatedAt: string;
};

type UserRow = {
    id: string;
    email: string;
    fullName: string | null;
    role: string;
    cooldownHours: number | null;
    scanDisabled: boolean;
    scanDisabledReason: string | null;
    expiresAt: string | null;
    overrideUpdatedAt: string | null;
    lastScanAt: string | null;
};

type AtsIngestInfo = {
    method: string;
    url: string;
    authHeader: string;
    authHeaderValue: string;
    curlExample: string;
    cronExample: string;
    notes: string;
};

type AtsIngestResult = {
    status?: string;
    sources_processed?: number;
    jobs_fetched?: number;
    jobs_inserted?: number;
    jobs_updated?: number;
    errors?: number;
};

export default function AdminScanControlsPage() {
    // ── Global settings ──────────────────────────────────────────────
    const [settings, setSettings]       = useState<GlobalSettings | null>(null);
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [savingGlobal, setSavingGlobal]       = useState(false);
    const [globalError, setGlobalError]         = useState<string | null>(null);
    const [globalSuccess, setGlobalSuccess]     = useState<string | null>(null);

    // Local working copy for the global form
    const [localCooldown, setLocalCooldown] = useState(6);
    const [localEnabled, setLocalEnabled]   = useState(true);
    const [localReason, setLocalReason]     = useState("");

    // ── Users ────────────────────────────────────────────────────────
    const [search, setSearch]                   = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [onlyOverrides, setOnlyOverrides]     = useState(false);
    const [users, setUsers]                     = useState<UserRow[]>([]);
    const [loadingUsers, setLoadingUsers]       = useState(true);
    const [savingUserId, setSavingUserId]       = useState<string | null>(null);
    const [usersError, setUsersError]           = useState<string | null>(null);

    // Per-row edit buffer (keyed by user id) so edits don't reset on re-fetch
    const [rowEdits, setRowEdits] = useState<
        Record<string, { cooldownHours: string; scanDisabled: boolean; reason: string }>
    >({});

    // ── ATS ingestion trigger ─────────────────────────────────────────
    const [atsInfo, setAtsInfo]           = useState<AtsIngestInfo | null>(null);
    const [atsInfoLoading, setAtsInfoLoading] = useState(true);
    const [atsRunning, setAtsRunning]     = useState(false);
    const [atsResult, setAtsResult]       = useState<AtsIngestResult | null>(null);
    const [atsError, setAtsError]         = useState<string | null>(null);
    const [copied, setCopied]             = useState<string | null>(null);

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
        return () => clearTimeout(t);
    }, [search]);

    // ── Load global settings ─────────────────────────────────────────
    const loadSettings = useCallback(async () => {
        setLoadingSettings(true);
        setGlobalError(null);
        try {
            const res = await fetch("/api/admin/scan-controls", { cache: "no-store" });
            if (!res.ok) throw new Error((await res.json()).error || "Load failed");
            const data: GlobalSettings = await res.json();
            setSettings(data);
            setLocalCooldown(data.cooldownHoursDefault);
            setLocalEnabled(data.scanEnabled);
            setLocalReason(data.scanDisabledReason || "");
        } catch (e: any) {
            setGlobalError(e?.message || "Failed to load settings");
        } finally {
            setLoadingSettings(false);
        }
    }, []);

    useEffect(() => { loadSettings(); }, [loadSettings]);

    // ── Load users ───────────────────────────────────────────────────
    const loadUsers = useCallback(async () => {
        setLoadingUsers(true);
        setUsersError(null);
        try {
            const qs = new URLSearchParams();
            if (debouncedSearch) qs.set("search", debouncedSearch);
            if (onlyOverrides)   qs.set("onlyOverrides", "1");
            qs.set("limit", "50");
            const res = await fetch(`/api/admin/scan-controls/users?${qs.toString()}`, {
                cache: "no-store",
            });
            if (!res.ok) throw new Error((await res.json()).error || "Load failed");
            const data: { users: UserRow[] } = await res.json();
            setUsers(data.users || []);
            // Seed rowEdits for any user we haven't touched yet
            setRowEdits((prev) => {
                const next = { ...prev };
                for (const u of data.users || []) {
                    if (!next[u.id]) {
                        next[u.id] = {
                            cooldownHours: u.cooldownHours?.toString() ?? "",
                            scanDisabled:  u.scanDisabled,
                            reason:        u.scanDisabledReason || "",
                        };
                    }
                }
                return next;
            });
        } catch (e: any) {
            setUsersError(e?.message || "Failed to load users");
        } finally {
            setLoadingUsers(false);
        }
    }, [debouncedSearch, onlyOverrides]);

    useEffect(() => { loadUsers(); }, [loadUsers]);

    // ── Load ATS ingestion info (URL + cron template) ────────────────
    const loadAtsInfo = useCallback(async () => {
        setAtsInfoLoading(true);
        try {
            const res = await fetch("/api/admin/ats-ingest", { cache: "no-store" });
            if (!res.ok) throw new Error((await res.json()).error || "Load failed");
            const data: AtsIngestInfo = await res.json();
            setAtsInfo(data);
        } catch {
            setAtsInfo(null);
        } finally {
            setAtsInfoLoading(false);
        }
    }, []);

    useEffect(() => { loadAtsInfo(); }, [loadAtsInfo]);

    const runAtsIngestion = async () => {
        setAtsRunning(true);
        setAtsError(null);
        setAtsResult(null);
        try {
            const res = await fetch("/api/admin/ats-ingest", { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || `Failed (${res.status})`);
            setAtsResult(data);
        } catch (e: any) {
            setAtsError(e?.message || "ATS ingestion failed");
        } finally {
            setAtsRunning(false);
        }
    };

    const copyToClipboard = async (text: string, key: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(key);
            setTimeout(() => setCopied((cur) => (cur === key ? null : cur)), 1500);
        } catch {
            // clipboard unavailable; fall through silently
        }
    };

    // ── Save global settings ─────────────────────────────────────────
    const saveGlobal = async () => {
        setSavingGlobal(true);
        setGlobalError(null);
        setGlobalSuccess(null);
        try {
            const res = await fetch("/api/admin/scan-controls", {
                method:  "PUT",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                    cooldownHoursDefault: Number(localCooldown),
                    scanEnabled:          localEnabled,
                    scanDisabledReason:   localReason.trim() || null,
                }),
            });
            if (!res.ok) throw new Error((await res.json()).error || "Save failed");
            const data: GlobalSettings = await res.json();
            setSettings(data);
            setGlobalSuccess("Saved.");
            setTimeout(() => setGlobalSuccess(null), 2500);
        } catch (e: any) {
            setGlobalError(e?.message || "Failed to save");
        } finally {
            setSavingGlobal(false);
        }
    };

    // ── Save user override ───────────────────────────────────────────
    const saveUser = async (u: UserRow) => {
        const edit = rowEdits[u.id];
        if (!edit) return;
        setSavingUserId(u.id);
        try {
            const hoursRaw = edit.cooldownHours.trim();
            const hours = hoursRaw === "" ? null : Number(hoursRaw);
            if (hours !== null && (!Number.isFinite(hours) || hours < 0 || hours > 168)) {
                throw new Error("Cooldown hours must be 0–168 or blank.");
            }
            const res = await fetch(`/api/admin/scan-controls/users/${u.id}`, {
                method:  "PUT",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                    cooldownHours:      hours,
                    scanDisabled:       edit.scanDisabled,
                    scanDisabledReason: edit.reason.trim() || null,
                }),
            });
            if (!res.ok) throw new Error((await res.json()).error || "Save failed");
            await loadUsers();
        } catch (e: any) {
            alert(e?.message || "Save failed");
        } finally {
            setSavingUserId(null);
        }
    };

    const clearUserOverride = async (u: UserRow) => {
        if (!confirm(`Clear override for ${u.email}? They'll use the global default.`)) return;
        setSavingUserId(u.id);
        try {
            const res = await fetch(`/api/admin/scan-controls/users/${u.id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error((await res.json()).error || "Delete failed");
            // Drop local edits for this row
            setRowEdits((prev) => {
                const next = { ...prev };
                delete next[u.id];
                return next;
            });
            await loadUsers();
        } catch (e: any) {
            alert(e?.message || "Delete failed");
        } finally {
            setSavingUserId(null);
        }
    };

    const hasOverride = (u: UserRow) =>
        u.cooldownHours !== null || u.scanDisabled || u.scanDisabledReason;

    const fmtDate = (iso: string | null) =>
        iso ? new Date(iso).toLocaleString() : "—";

    const summary = useMemo(() => {
        const overrideCount = users.filter(hasOverride).length;
        const disabledCount = users.filter((u) => u.scanDisabled).length;
        return { overrideCount, disabledCount };
    }, [users]);

    return (
        <div className="max-w-6xl mx-auto space-y-8">

            {/* Page header */}
            <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <Shield className="w-5 h-5 text-red-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Scan Controls</h1>
                    <p className="text-sm text-gray-400 mt-1 max-w-2xl">
                        Control how often users can run Job Scrapper. Adjust the global cooldown,
                        pause all scans during maintenance, or apply per-user overrides.
                    </p>
                </div>
            </div>

            {/* Global settings card ───────────────────────────────── */}
            <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6 space-y-5">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                            Global Settings
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            Applies to every user unless overridden below.
                        </p>
                    </div>
                    {loadingSettings && <Loader2 className="w-4 h-4 animate-spin text-gray-500" />}
                </div>

                {globalError && (
                    <div className="flex items-center gap-2 text-sm text-amber-400 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <AlertTriangle className="w-4 h-4" />
                        {globalError}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Cooldown hours */}
                    <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            Cooldown (hours)
                        </span>
                        <div className="flex items-center gap-3 mt-2">
                            <input
                                type="range"
                                min={0}
                                max={72}
                                step={1}
                                value={localCooldown}
                                onChange={(e) => setLocalCooldown(Number(e.target.value))}
                                className="flex-1 accent-red-500"
                            />
                            <input
                                type="number"
                                min={0}
                                max={168}
                                value={localCooldown}
                                onChange={(e) => setLocalCooldown(Number(e.target.value))}
                                className="w-20 px-2 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-sm text-white text-center focus:outline-none focus:border-red-500/50"
                            />
                            <span className="text-xs text-gray-500">h</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1.5">
                            Users must wait this long between scans. Range 0–168 (1 week).
                        </p>
                    </label>

                    {/* Scan enabled toggle */}
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            Scan enabled
                        </span>
                        <div className="mt-2 flex gap-2">
                            <button
                                onClick={() => setLocalEnabled(true)}
                                className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-semibold transition ${localEnabled
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                    : "bg-zinc-900 text-gray-400 border-white/10 hover:border-white/20"
                                    }`}
                            >
                                <Power className="w-4 h-4" />
                                Enabled
                            </button>
                            <button
                                onClick={() => setLocalEnabled(false)}
                                className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-semibold transition ${!localEnabled
                                    ? "bg-red-500/10 text-red-400 border-red-500/30"
                                    : "bg-zinc-900 text-gray-400 border-white/10 hover:border-white/20"
                                    }`}
                            >
                                <PowerOff className="w-4 h-4" />
                                Disabled
                            </button>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1.5">
                            Disabling blocks every user's scan button until re-enabled.
                        </p>
                    </div>
                </div>

                {/* Reason (only meaningful if disabled) */}
                <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        Reason shown to users {!localEnabled && <span className="text-red-400">(required)</span>}
                    </span>
                    <input
                        type="text"
                        value={localReason}
                        onChange={(e) => setLocalReason(e.target.value)}
                        placeholder="e.g. Maintenance in progress — back in 30 min"
                        maxLength={500}
                        className="mt-2 w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/50"
                    />
                </div>

                <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5">
                    <div className="text-xs text-gray-500">
                        {settings?.updatedAt && (
                            <>Last updated {fmtDate(settings.updatedAt)}</>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {globalSuccess && (
                            <span className="text-xs text-emerald-400">{globalSuccess}</span>
                        )}
                        <button
                            onClick={saveGlobal}
                            disabled={savingGlobal || loadingSettings}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-bold uppercase tracking-wider hover:bg-red-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {savingGlobal ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            Save Settings
                        </button>
                    </div>
                </div>
            </section>

            {/* ATS ingestion trigger ──────────────────────────────── */}
            <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6 space-y-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                            <Database className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                                ATS Ingestion
                            </h2>
                            <p className="text-xs text-gray-500 mt-1 max-w-xl">
                                Pull fresh jobs from every connected ATS feed (Greenhouse, Lever, Ashby,
                                Workable, etc.) and upsert them into the Find Jobs board. Trigger
                                manually below or point a cron job at the URL.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={runAtsIngestion}
                        disabled={atsRunning}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-bold uppercase tracking-wider hover:bg-indigo-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {atsRunning ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Running…
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4" />
                                Run ATS ingestion now
                            </>
                        )}
                    </button>
                </div>

                {atsError && (
                    <div className="flex items-center gap-2 text-sm text-amber-400 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        {atsError}
                    </div>
                )}

                {atsResult && (
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400 mb-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Ingestion complete
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                            <div>
                                <div className="text-gray-500 uppercase tracking-wider text-[10px]">Sources</div>
                                <div className="text-white font-bold text-base">{atsResult.sources_processed ?? 0}</div>
                            </div>
                            <div>
                                <div className="text-gray-500 uppercase tracking-wider text-[10px]">Fetched</div>
                                <div className="text-white font-bold text-base">{atsResult.jobs_fetched ?? 0}</div>
                            </div>
                            <div>
                                <div className="text-gray-500 uppercase tracking-wider text-[10px]">Inserted</div>
                                <div className="text-emerald-400 font-bold text-base">{atsResult.jobs_inserted ?? 0}</div>
                            </div>
                            <div>
                                <div className="text-gray-500 uppercase tracking-wider text-[10px]">Updated</div>
                                <div className="text-blue-400 font-bold text-base">{atsResult.jobs_updated ?? 0}</div>
                            </div>
                            <div>
                                <div className="text-gray-500 uppercase tracking-wider text-[10px]">Errors</div>
                                <div className={`font-bold text-base ${(atsResult.errors ?? 0) > 0 ? "text-amber-400" : "text-gray-300"}`}>
                                    {atsResult.errors ?? 0}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Cron URL block */}
                <div className="rounded-lg border border-white/10 bg-zinc-900/60 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                            <RefreshCw className="w-3.5 h-3.5" />
                            Cron URL
                        </div>
                        {atsInfoLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" />}
                    </div>

                    {atsInfo ? (
                        <div className="space-y-3">
                            <div>
                                <div className="text-[11px] text-gray-500 mb-1">Endpoint</div>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 px-3 py-2 bg-black/40 rounded-md text-xs text-emerald-300 font-mono overflow-x-auto">
                                        {atsInfo.method} {atsInfo.url}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(atsInfo.url, "url")}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-white/10 text-gray-400 text-xs hover:text-white hover:border-white/20 transition"
                                    >
                                        {copied === "url" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <div className="text-[11px] text-gray-500 mb-1">Auth header</div>
                                <code className="block px-3 py-2 bg-black/40 rounded-md text-xs text-amber-300 font-mono">
                                    {atsInfo.authHeader}: {atsInfo.authHeaderValue}
                                </code>
                            </div>

                            <div>
                                <div className="text-[11px] text-gray-500 mb-1">Cron example (every 6 h)</div>
                                <div className="flex items-start gap-2">
                                    <code className="flex-1 px-3 py-2 bg-black/40 rounded-md text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap break-all">
                                        {atsInfo.cronExample}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(atsInfo.cronExample, "cron")}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-white/10 text-gray-400 text-xs hover:text-white hover:border-white/20 transition flex-shrink-0"
                                    >
                                        {copied === "cron" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>

                            <p className="text-[11px] text-gray-500">
                                {atsInfo.notes}
                            </p>
                        </div>
                    ) : (
                        !atsInfoLoading && (
                            <p className="text-xs text-gray-500">
                                Could not load the ingestion endpoint info.
                            </p>
                        )
                    )}
                </div>
            </section>

            {/* Per-user overrides ─────────────────────────────────── */}
            <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6 space-y-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                            Per-user Overrides
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            Set a custom cooldown or block scanning for specific users.
                            {summary.overrideCount > 0 && (
                                <span className="ml-2 text-gray-400">
                                    {summary.overrideCount} override{summary.overrideCount === 1 ? "" : "s"}
                                    {summary.disabledCount > 0 && ` · ${summary.disabledCount} blocked`}
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search by email or name..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 pr-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 w-72"
                            />
                        </div>
                        <label className="inline-flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={onlyOverrides}
                                onChange={(e) => setOnlyOverrides(e.target.checked)}
                                className="accent-red-500"
                            />
                            Only overrides
                        </label>
                    </div>
                </div>

                {usersError && (
                    <div className="flex items-center gap-2 text-sm text-amber-400 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <AlertTriangle className="w-4 h-4" />
                        {usersError}
                    </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto -mx-6">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-white/5">
                                <th className="py-3 px-6">User</th>
                                <th className="py-3 px-2">Last scan</th>
                                <th className="py-3 px-2">Cooldown (h)</th>
                                <th className="py-3 px-2">Status</th>
                                <th className="py-3 px-2">Reason</th>
                                <th className="py-3 px-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingUsers && users.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-10 text-center text-gray-500">
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                    </td>
                                </tr>
                            )}
                            {!loadingUsers && users.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-10 text-center text-gray-500">
                                        No users match.
                                    </td>
                                </tr>
                            )}
                            {users.map((u) => {
                                const edit = rowEdits[u.id] || {
                                    cooldownHours: u.cooldownHours?.toString() ?? "",
                                    scanDisabled:  u.scanDisabled,
                                    reason:        u.scanDisabledReason || "",
                                };
                                const saving = savingUserId === u.id;
                                const dirty =
                                    edit.cooldownHours !== (u.cooldownHours?.toString() ?? "") ||
                                    edit.scanDisabled !== u.scanDisabled ||
                                    edit.reason !== (u.scanDisabledReason || "");
                                return (
                                    <tr
                                        key={u.id}
                                        className={`border-b border-white/5 ${hasOverride(u) ? "bg-red-500/5" : ""}`}
                                    >
                                        <td className="py-3 px-6">
                                            <div className="flex items-center gap-2">
                                                <div>
                                                    <div className="text-white font-medium">{u.email}</div>
                                                    {u.fullName && (
                                                        <div className="text-xs text-gray-500">{u.fullName}</div>
                                                    )}
                                                </div>
                                                {u.role === "ADMIN" && (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                                                        Admin
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 px-2 text-xs text-gray-400 whitespace-nowrap">
                                            {u.lastScanAt ? fmtDate(u.lastScanAt) : <span className="text-gray-600">Never</span>}
                                        </td>
                                        <td className="py-3 px-2">
                                            <input
                                                type="number"
                                                min={0}
                                                max={168}
                                                value={edit.cooldownHours}
                                                placeholder="default"
                                                onChange={(e) =>
                                                    setRowEdits((prev) => ({
                                                        ...prev,
                                                        [u.id]: { ...edit, cooldownHours: e.target.value },
                                                    }))
                                                }
                                                className="w-24 px-2 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-sm text-white text-center focus:outline-none focus:border-red-500/50"
                                            />
                                        </td>
                                        <td className="py-3 px-2">
                                            <button
                                                onClick={() =>
                                                    setRowEdits((prev) => ({
                                                        ...prev,
                                                        [u.id]: { ...edit, scanDisabled: !edit.scanDisabled },
                                                    }))
                                                }
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition ${edit.scanDisabled
                                                    ? "bg-red-500/10 text-red-400 border-red-500/30"
                                                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                                    }`}
                                            >
                                                {edit.scanDisabled ? (
                                                    <>
                                                        <UserX className="w-3 h-3" />
                                                        Blocked
                                                    </>
                                                ) : (
                                                    <>
                                                        <UserCheck className="w-3 h-3" />
                                                        Allowed
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                        <td className="py-3 px-2">
                                            <input
                                                type="text"
                                                value={edit.reason}
                                                onChange={(e) =>
                                                    setRowEdits((prev) => ({
                                                        ...prev,
                                                        [u.id]: { ...edit, reason: e.target.value },
                                                    }))
                                                }
                                                placeholder="Optional note…"
                                                className="w-full px-2 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/50"
                                            />
                                        </td>
                                        <td className="py-3 px-6 text-right">
                                            <div className="inline-flex items-center gap-1.5">
                                                <button
                                                    onClick={() => saveUser(u)}
                                                    disabled={saving || !dirty}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-500 text-white text-xs font-bold uppercase tracking-wider hover:bg-red-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    {saving ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Save className="w-3.5 h-3.5" />
                                                    )}
                                                    Save
                                                </button>
                                                {hasOverride(u) && (
                                                    <button
                                                        onClick={() => clearUserOverride(u)}
                                                        disabled={saving}
                                                        title="Revert to global default"
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-white/10 text-gray-400 text-xs hover:text-white hover:border-white/20 transition disabled:opacity-40"
                                                    >
                                                        <Undo2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Help text */}
            <div className="flex items-start gap-2 text-xs text-gray-500 max-w-3xl">
                <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>
                    Users see a countdown on the "Scan Jobs" button until their cooldown
                    clears. If you disable a user's scan, they'll see the reason you entered here.
                </p>
            </div>
        </div>
    );
}
