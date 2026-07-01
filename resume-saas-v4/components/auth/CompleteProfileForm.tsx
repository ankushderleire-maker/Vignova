"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function CompleteProfileForm() {
    const router = useRouter();
    const [country, setCountry] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/user/complete-profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ country }),
            });

            if (res.ok) {
                router.push("/dashboard");
                router.refresh();
            } else {
                const data = await res.json();
                setError(data.error || "Failed to save profile");
            }
        } catch (err) {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="w-full flex flex-col" onSubmit={handleSubmit}>
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Country
                </label>
                <select
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all appearance-none"
                >
                    <option value="" disabled>Select Country</option>
                    <option value="US">United States (US)</option>
                    <option value="IN">India (IN)</option>
                    <option value="GB">United Kingdom (GB)</option>
                    <option value="CA">Canada (CA)</option>
                    <option value="AU">Australia (AU)</option>
                    <option value="IE">Ireland (IE)</option>
                </select>
            </div>

            {error && (
                <div className="mb-4 text-xs text-red-400 font-medium text-center">
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={loading || !country}
                className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold rounded-xl py-3 hover:bg-gray-100 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
            >
                {loading && <Loader2 className="w-4 h-4 animate-spin text-black" />}
                {loading ? 'Saving...' : 'Continue to Dashboard'}
            </button>
        </form>
    );
}
