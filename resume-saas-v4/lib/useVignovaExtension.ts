"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * The Vignova Chrome extension, as a dashboard page can see it.
 *
 * The extension's dashboard_bridge.js content script answers
 * VIGNOVA_EXTENSION_PING with its id, version and features over
 * window.postMessage; that is the only channel, so no extension id has to be
 * built into the dashboard. When Admin -> Extension sets an Extension ID, an
 * extension reporting a different id counts as a mismatch. Leave it blank to
 * accept any Vignova build: an unpacked copy gets a different id on every
 * machine.
 */

export type ExtensionStatus = "checking" | "installed" | "missing" | "mismatch";
export type NaukriScanReply = { success: boolean; authenticated: boolean; error: string };

type Pong = { extensionId?: string; extensionVersion?: string; features?: string[] };

// The content script loads at document_idle, possibly after this page does.
const PING_DELAYS_MS = [0, 400, 1200, 2500];
const GIVE_UP_MS = 4000;
const SCAN_REPLY_TIMEOUT_MS = 10_000;

const fromThisPage = (event: MessageEvent) => event.source === window && event.origin === window.location.origin;

export function useVignovaExtension() {
    const [pong, setPong] = useState<Pong | null>(null);
    const [expectedId, setExpectedId] = useState<string | null>(null);
    const [installUrl, setInstallUrl] = useState("/dashboard/extension");
    const [timedOut, setTimedOut] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/extension-config")
            .then((res) => res.json())
            .then((config) => {
                if (cancelled) return;
                setExpectedId(typeof config?.extensionId === "string" ? config.extensionId.trim() : "");
                if (typeof config?.installUrl === "string" && config.installUrl.trim()) setInstallUrl(config.installUrl.trim());
            })
            .catch(() => {
                if (!cancelled) setExpectedId("");
            });

        const onMessage = (event: MessageEvent) => {
            if (fromThisPage(event) && event.data?.type === "VIGNOVA_EXTENSION_PONG") setPong(event.data as Pong);
        };
        window.addEventListener("message", onMessage);
        const timers = PING_DELAYS_MS.map((delay) =>
            setTimeout(() => window.postMessage({ type: "VIGNOVA_EXTENSION_PING" }, window.location.origin), delay)
        );
        timers.push(setTimeout(() => !cancelled && setTimedOut(true), GIVE_UP_MS));
        return () => {
            cancelled = true;
            window.removeEventListener("message", onMessage);
            timers.forEach(clearTimeout);
        };
    }, []);

    let status: ExtensionStatus = timedOut ? "missing" : "checking";
    if (pong && expectedId !== null) {
        status = expectedId && pong.extensionId && pong.extensionId !== expectedId ? "mismatch" : "installed";
    }

    /**
     * Asks the extension to open the Naukri profile and scan it. The result
     * opens on the Naukri Optimizer, or back on the Master Profile with
     * `returnTo` "profile" when the extension supports that.
     */
    const requestNaukriScan = useCallback(
        (returnTo?: "profile") =>
            new Promise<NaukriScanReply>((resolve) => {
                const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
                const onReply = (event: MessageEvent) => {
                    if (!fromThisPage(event) || event.data?.type !== "VIGNOVA_NAUKRI_SCAN_RESULT" || event.data.requestId !== requestId) return;
                    finish({ success: !!event.data.success, authenticated: event.data.authenticated !== false, error: String(event.data.error || "") });
                };
                const finish = (reply: NaukriScanReply) => {
                    clearTimeout(timer);
                    window.removeEventListener("message", onReply);
                    resolve(reply);
                };
                const timer = setTimeout(
                    () => finish({ success: false, authenticated: true, error: "The extension did not answer. Reload this page and try again." }),
                    SCAN_REPLY_TIMEOUT_MS
                );
                window.addEventListener("message", onReply);
                window.postMessage({ type: "VIGNOVA_NAUKRI_SCAN", requestId, returnTo }, window.location.origin);
            }),
        []
    );

    return {
        status,
        version: pong?.extensionVersion || "",
        supportsNaukriScan: status === "installed" && !!pong?.features?.includes("naukri-scan"),
        /** Whether a scan brings the user back to the page that started it. */
        supportsNaukriReturn: status === "installed" && !!pong?.features?.includes("naukri-scan-return"),
        installUrl,
        requestNaukriScan,
    };
}
