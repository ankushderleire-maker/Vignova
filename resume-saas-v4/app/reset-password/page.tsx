"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Loader2, CheckCircle2 } from "lucide-react";

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            setError("Invalid or missing password reset token.");
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!token) {
            setError("Invalid or missing password reset token.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Failed to reset password.");
            }

            setSuccess(true);
            setTimeout(() => {
                router.push("/login");
            }, 3000);
        } catch (err: any) {
            setError(err.message || "Failed to reset password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen w-full items-center justify-center bg-black font-ui selection:bg-white/20">
            {/* THEME BACKGROUND */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#059669_0%,#000000_60%)] opacity-80" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
            </div>

            {/* CARD CONTENT */}
            <div className="relative z-10 w-full max-w-[500px] rounded-[24px] bg-black/20 p-6 sm:p-8 backdrop-blur-[32px] border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] my-auto flex flex-col">
                
                {/* Logo & Brand */}
                <div className="flex items-end justify-center mb-5">
                     <img src="/logo.png" alt="Vignova Logo" className="w-10 h-10 object-contain" />
                     <span className="text-2xl font-bold text-white tracking-tight -ml-1">VIGNOVA</span>
                </div>

                {!success ? (
                    <>
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2 text-center">
                            Create new password
                        </h2>
                        <p className="text-sm text-gray-400 text-center mb-6">
                            Your new password must be different from previous used passwords.
                        </p>

                        <form className="w-full flex flex-col" onSubmit={handleSubmit}>
                            
                            <div className="space-y-3">
                                {/* Password Field */}
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-500" />
                                    <input
                                        type="password"
                                        required
                                        placeholder="New Password"
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-12 pr-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={!token}
                                    />
                                </div>

                                {/* Confirm Password Field */}
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-500" />
                                    <input
                                        type="password"
                                        required
                                        placeholder="Confirm Password"
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-12 pr-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        disabled={!token}
                                    />
                                </div>
                            </div>

                            {/* Fixed Height Error Container */}
                            <div className="min-h-[20px] flex items-center justify-center mt-3 mb-1">
                                {error && (
                                    <p className="text-xs text-red-400 font-medium text-center">{error}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !token}
                                className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold rounded-xl py-3 hover:bg-gray-100 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin text-black" />}
                                {loading ? 'Resetting password...' : 'Reset password'}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-4 animate-in fade-in zoom-in duration-300">
                        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4 border border-green-500/30">
                            <CheckCircle2 className="w-6 h-6 text-green-400" />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2 text-center">
                            Password Reset
                        </h2>
                        <p className="text-sm text-gray-400 text-center mb-6 max-w-[280px]">
                            Your password has been successfully reset. Redirecting you to login...
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen w-full items-center justify-center bg-black">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    );
}
