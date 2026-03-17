/**
 * Vignova Extension — Shared API Utility
 * All API calls go through this helper to attach the auth token.
 */

const Vignova_API_BASE = "http://localhost:3000";

const Vignova_API = {
    /**
     * Get the stored auth token from chrome.storage
     */
    async getToken() {
        return new Promise((resolve) => {
            chrome.storage.local.get(["vignova_token"], (result) => {
                resolve(result.vignova_token || null);
            });
        });
    },

    /**
     * Save token to chrome.storage
     */
    async setToken(token) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ vignova_token: token }, resolve);
        });
    },

    /**
     * Save user data to chrome.storage
     */
    async setUser(userData) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ vignova_user: userData }, resolve);
        });
    },

    /**
     * Get user data from chrome.storage
     */
    async getUser() {
        return new Promise((resolve) => {
            chrome.storage.local.get(["vignova_user"], (result) => {
                resolve(result.vignova_user || null);
            });
        });
    },

    /**
     * Clear all stored data (logout)
     */
    async clearAll() {
        return new Promise((resolve) => {
            chrome.storage.local.remove(["vignova_token", "vignova_user"], resolve);
        });
    },

    /**
     * Make authenticated API call
     */
    async fetch(endpoint, options = {}) {
        const token = await this.getToken();

        const response = await fetch(`${Vignova_API_BASE}${endpoint}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...options.headers,
            },
        });

        return response;
    },

    /**
     * Login and store token
     */
    async login(email, password) {
        const response = await this.fetch("/api/extension/auth", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok && data.token) {
            await this.setToken(data.token);
            await this.setUser(data.user);
            return { success: true, user: data.user };
        }

        return {
            success: false,
            error: data.error || "Login failed",
            upgrade_required: data.upgrade_required || false,
        };
    },

    /**
     * Get current status
     */
    async getStatus() {
        const response = await this.fetch("/api/extension/status");

        if (response.status === 401) {
            await this.clearAll();
            return { authenticated: false };
        }

        if (!response.ok) {
            return { authenticated: false, error: "Server error" };
        }

        const data = await response.json();
        return { authenticated: true, ...data };
    },

    /**
     * Generate tailored resume
     */
    async generateResume(jobData) {
        const response = await this.fetch("/api/extension/generate", {
            method: "POST",
            body: JSON.stringify(jobData),
        });

        const data = await response.json();

        if (response.ok) {
            // Update cached credits
            const user = await this.getUser();
            if (user) {
                user.credits_remaining = data.credits_remaining;
                await this.setUser(user);
            }
            return { success: true, ...data };
        }

        return { success: false, error: data.error || "Generation failed" };
    },
};
