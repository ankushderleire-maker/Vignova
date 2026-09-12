// Website cookies and the extension token must identify the same account.
// Serialize storage mutations and reject responses from an earlier session.
const USER_DATA_KEYS = [
    "vignova_token", "vignova_user", "vignova_agent_profile",
    "vignova_recent_jobs", "vignova_config", "vignova_auth_source",
    "vignova_alert_notify", "vignova_alert_checked", "vignova_alert_seen",
];
let authEpoch = 0;
let profileCacheVersion = 0;
let authQueue = Promise.resolve();
let lastStatusCheck = 0;

function queueAuth(work) {
    const pending = authQueue.then(work);
    authQueue = pending.catch(() => {});
    return pending;
}

function broadcastAuthChange() {
    chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
            if (tab.id) chrome.tabs.sendMessage(tab.id, { type: "AUTH_STATE_CHANGED" }).catch(() => {});
        }
    });
}

function isSessionCookie(cookie) {
    return /^(?:__Secure-)?next-auth\.session-token(?:\.\d+)?$/.test(cookie.name) &&
        ["app.vignova.io", "vignova.io"].includes(cookie.domain.replace(/^\./, ""));
}

async function webSessionKey() {
    const cookies = (await chrome.cookies.getAll({ url: Vignova_API_BASE }))
        .filter(isSessionCookie).sort((a, b) => a.name.localeCompare(b.name));
    if (!cookies.length) return "";
    // Persist only a digest, never a copy of the website session cookies.
    const bytes = new TextEncoder().encode(JSON.stringify(cookies.map(c => [c.name, c.value])));
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}

async function clearUserData() {
    const stored = await chrome.storage.local.get(null);
    const jobKeys = Object.keys(stored).filter(key => /^https?:\/\//.test(key));
    await chrome.storage.local.remove([...USER_DATA_KEYS, ...jobKeys]);
    lastStatusCheck = 0;
    broadcastAuthChange();
}

async function probeWebSession() {
    try {
        if (!await webSessionKey()) return { loggedIn: false };
        const response = await fetch(`${Vignova_API_BASE}/api/extension/session-token`, {
            credentials: "include", cache: "no-store",
        });
        const data = await response.json();
        if (response.ok && data.token) return { loggedIn: true, token: data.token, user: data.user };
        if (response.status === 401 || response.status === 404) return { loggedIn: false };
        throw new Error("Session lookup failed");
    } catch (_) {
        return { loggedIn: false, error: "Cannot verify your Vignova session. Please try again." };
    }
}

function statusUser(data) {
    return { ...data.user, plan: data.plan_type || "FREE", plan_type: data.plan_type || "FREE",
        credits_remaining: data.credits_remaining ?? 0, credits_total: data.credits_total ?? 0 };
}

async function fetchAccountStatus(token) {
    const response = await fetch(`${Vignova_API_BASE}/api/extension/status`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
    });
    if (!response.ok) throw new Error("Please sign in again to verify your account.");
    return response.json();
}

async function commitSignIn(token, source, key, epoch) {
    const status = await fetchAccountStatus(token);
    if (epoch !== authEpoch) return false;
    await clearUserData();
    await chrome.storage.local.remove("vignova_signed_out");
    await chrome.storage.local.set({ vignova_token: token, vignova_user: statusUser(status),
        vignova_auth_source: source, vignova_web_session_key: key });
    lastStatusCheck = Date.now();
    broadcastAuthChange();
    void warmExtensionCache(token, epoch);
    return true;
}

async function signInWithToken(token, user, source = "website", expectedEpoch = authEpoch) {
    return queueAuth(async () => {
        if (expectedEpoch !== authEpoch) return false;
        const key = await webSessionKey();
        const epoch = ++authEpoch;
        await clearUserData();
        return commitSignIn(token, source, key, epoch);
    });
}

function signOut() {
    ++authEpoch;
    return queueAuth(async () => {
        await clearUserData();
        await chrome.storage.local.set({ vignova_signed_out: true });
    });
}

function writeUserCache(values, token, epoch = authEpoch, profileVersion = profileCacheVersion) {
    return queueAuth(async () => {
        const stored = await chrome.storage.local.get("vignova_token");
        if (epoch !== authEpoch || !token || stored.vignova_token !== token ||
            (values.vignova_agent_profile && profileVersion !== profileCacheVersion)) return false;
        await chrome.storage.local.set(values);
        return true;
    });
}

// Called before every account operation, including after a service worker restart.
function syncWebSession({ refreshStatus = false, statusMaxAge = 60000, force = false, adopt = false } = {}) {
    return queueAuth(async () => {
        const key = await webSessionKey();
        const stored = await chrome.storage.local.get([
            "vignova_token", "vignova_user", "vignova_signed_out",
            "vignova_web_session_key", "vignova_auth_source",
        ]);
        const changed = stored.vignova_web_session_key !== key;
        if (changed || force || adopt) {
            const epoch = ++authEpoch;
            // An independent password login remains usable when no website session exists.
            const independent = !key && stored.vignova_auth_source === "password" && !changed;
            if (!independent) await clearUserData();
            if (key && (!stored.vignova_signed_out || adopt)) {
                const session = await probeWebSession();
                if (epoch !== authEpoch) return null;
                if (session.error) throw new Error(session.error);
                if (session.token) await commitSignIn(session.token, "website", key, epoch);
            }
            if (epoch !== authEpoch) return null;
            await chrome.storage.local.set({ vignova_web_session_key: key });
        }
        const current = await chrome.storage.local.get(["vignova_token", "vignova_user"]);
        if (current.vignova_token && refreshStatus && Date.now() - lastStatusCheck >= statusMaxAge) {
            const epoch = authEpoch;
            try {
                const data = await fetchAccountStatus(current.vignova_token);
                if (epoch !== authEpoch) return null;
                const user = statusUser(data);
                await chrome.storage.local.set({ vignova_user: user });
                lastStatusCheck = Date.now();
                if (user.plan !== current.vignova_user?.plan) broadcastAuthChange();
            } catch (error) {
                if (epoch === authEpoch) {
                    ++authEpoch;
                    await clearUserData();
                    // Permit a verified website session to recover on the next request.
                    await chrome.storage.local.remove("vignova_web_session_key");
                }
                throw error;
            }
        }
        return authEpoch;
    });
}

chrome.cookies.onChanged.addListener(({ cookie }) => {
    if (!isSessionCookie(cookie)) return;
    // Invalidate synchronously, before any pending response can reach a tab.
    ++authEpoch;
    void queueAuth(clearUserData).then(() => syncWebSession({ force: true })).catch(() => {});
});
