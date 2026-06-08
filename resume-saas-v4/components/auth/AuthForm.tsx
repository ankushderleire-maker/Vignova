"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Mail, ChevronDown, Loader2, Lock, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

interface AuthFormProps {
    defaultMode?: "signin" | "signup";
}

export function AuthForm({ defaultMode = "signup" }: AuthFormProps) {
    const router = useRouter();
    const [mode, setMode] = useState<"signin" | "signup">(defaultMode);
    
    // Form fields
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            if (mode === "signup") {
                const res = await fetch("/api/auth/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        fullName: `${firstName} ${lastName}`.trim(),
                        email,
                        password,
                    }),
                });

                if (res.ok) {
                    setMode("signin");
                } else {
                    const data = await res.json();
                    setError(data.error || "Registration failed");
                }
            } else {
                const res = await signIn("credentials", {
                    redirect: false,
                    email,
                    password,
                });

                if (res?.error) {
                    setError("Invalid email or password");
                } else {
                    router.push("/dashboard");
                    router.refresh();
                }
            }
        } catch (err) {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = (provider: "google" | "linkedin") => {
        setLoading(true);
        signIn(provider, { callbackUrl: "/dashboard" });
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

                {/* Pill Toggle */}
                <div className="flex bg-black/40 rounded-full p-1 w-full max-w-[220px] mx-auto border border-white/[0.08] mb-5 shadow-inner relative">
                    {/* Sliding background indicator */}
                    <div 
                        className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#2a2a2a] rounded-full transition-transform duration-300 ease-out shadow-sm border border-white/5" 
                        style={{ transform: mode === 'signup' ? 'translateX(0)' : 'translateX(100%)' }}
                    />
                    <button 
                        onClick={() => { setMode('signup'); setError(""); }} 
                        className={`relative z-10 flex-1 rounded-full text-sm font-medium py-1 sm:py-1.5 transition-colors duration-300 ${mode === 'signup' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Sign up
                    </button>
                    <button 
                        onClick={() => { setMode('signin'); setError(""); }} 
                        className={`relative z-10 flex-1 rounded-full text-sm font-medium py-1 sm:py-1.5 transition-colors duration-300 ${mode === 'signin' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Sign in
                    </button>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-5 text-center">
                    {mode === 'signup' ? 'Create an account' : 'Welcome back'}
                </h2>

                <form className="w-full flex flex-col" onSubmit={handleSubmit}>
                    
                    {/* Sign Up Fields - Names (Animated) */}
                    <div className={`grid transition-[grid-template-rows,margin] duration-300 ease-in-out ${mode === 'signup' ? 'grid-rows-[1fr] mb-3' : 'grid-rows-[0fr] mb-0'}`}>
                        <div className="overflow-hidden">
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    required={mode === 'signup'}
                                    placeholder="First name"
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    tabIndex={mode === 'signup' ? 0 : -1}
                                />
                                <div className="relative flex items-center bg-white/[0.03] border border-white/10 rounded-xl focus-within:border-white/20 focus-within:bg-white/[0.06] transition-all overflow-hidden">
                                   <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[1px] h-6 bg-white/10" />
                                   <input
                                        type="text"
                                        required={mode === 'signup'}
                                        placeholder="Last name"
                                        className="w-full bg-transparent border-none px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-0"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        tabIndex={mode === 'signup' ? 0 : -1}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Shared Field - Email */}
                    <div className="relative mb-3">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-500" />
                        <input
                            type="email"
                            required
                            placeholder="Enter your email"
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-12 pr-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    {/* Sign Up Field - Phone (Animated) */}
                    <div className={`grid transition-[grid-template-rows,margin] duration-300 ease-in-out ${mode === 'signup' ? 'grid-rows-[1fr] mb-3' : 'grid-rows-[0fr] mb-0'}`}>
                        <div className="overflow-hidden">
                            <div className="relative flex items-center bg-white/[0.03] border border-white/10 rounded-xl focus-within:border-white/20 focus-within:bg-white/[0.06] transition-all">
                                <div className="flex items-center gap-2 pl-4 pr-3 py-2.5 border-r border-white/10 shrink-0 cursor-pointer hover:bg-white/5 rounded-l-xl transition-colors">
                                    <span className="text-base leading-none">🇺🇸</span>
                                    <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                                </div>
                                <input
                                    type="tel"
                                    placeholder="(775) 351-6501"
                                    className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-sm text-white placeholder:text-gray-500 px-4 py-2.5"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    tabIndex={mode === 'signup' ? 0 : -1}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Shared Field - Password */}
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-500" />
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            placeholder="Password"
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-12 pr-12 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors focus:outline-none"
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                        </button>
                    </div>

                    {/* Fixed Height Error Container */}
                    <div className="min-h-[20px] flex items-center justify-center mt-3 mb-1">
                        {error && (
                            <p className="text-xs text-red-400 font-medium">{error}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold rounded-xl py-3 hover:bg-gray-100 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin text-black" />}
                        {mode === 'signup' ? (loading ? 'Creating...' : 'Create an account') : (loading ? 'Signing in...' : 'Sign in')}
                    </button>

                    {/* Forgot Password Link (Animated) */}
                    <div className={`grid transition-[grid-template-rows,margin] duration-300 ease-in-out ${mode === 'signin' ? 'grid-rows-[1fr] mt-4' : 'grid-rows-[0fr] mt-0'}`}>
                        <div className="overflow-hidden flex justify-center">
                            <Link href="/forgot-password" className="text-xs text-gray-400 hover:text-white transition-colors font-medium cursor-pointer" tabIndex={mode === 'signin' ? 0 : -1}>
                                Forgot password?
                            </Link>
                        </div>
                    </div>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-4 my-5 opacity-60">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                        Or sign in with
                    </span>
                    <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* Social Login */}
                <div className="flex gap-4 mb-5">
                    <button
                        type="button"
                        onClick={() => handleSocialLogin('google')}
                        disabled={loading}
                        className="flex-1 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 py-2.5 flex items-center justify-center transition-all disabled:opacity-50 active:scale-95"
                    >
                        <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                            <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                            </g>
                        </svg>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSocialLogin('linkedin')}
                        disabled={loading}
                        className="flex-1 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 py-2.5 flex items-center justify-center transition-all disabled:opacity-50 active:scale-95"
                    >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="white" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                        </svg>
                    </button>
                </div>

                <div className="text-center">
                    <p className="text-[11px] text-gray-400 font-medium">
                        By creating an account, you agree to our <a href="#" className="text-gray-300 hover:text-white transition-colors">Terms & Service</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
