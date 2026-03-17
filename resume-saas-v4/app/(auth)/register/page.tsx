// 'use client';
// import { useState } from 'react';
// import { useRouter } from 'next/navigation';

// export default function Register() {
//   const router = useRouter();
//   const [loading, setLoading] = useState(false);

//   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     setLoading(true);

//     const formData = new FormData(e.currentTarget);
    
//     const res = await fetch('/api/auth/register', {
//       method: 'POST',
//       body: JSON.stringify({
//         fullName: formData.get('fullName'),
//         email: formData.get('email'),
//         password: formData.get('password'),
//       }),
//     });

//     if (res.ok) {
//       alert("Account Created!");
//       router.push('/'); // We will build login later
//     } else {
//       alert("Error creating account");
//     }
//     setLoading(false);
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-black text-white">
//       <form onSubmit={handleSubmit} className="p-8 border border-gray-700 rounded-lg w-96 space-y-4">
//         <h1 className="text-2xl font-bold mb-4">Register</h1>
        
//         <input name="fullName" placeholder="Name" required className="w-full p-2 bg-gray-900 border border-gray-700 rounded" />
//         <input name="email" type="email" placeholder="Email" required className="w-full p-2 bg-gray-900 border border-gray-700 rounded" />
//         <input name="password" type="password" placeholder="Password" required className="w-full p-2 bg-gray-900 border border-gray-700 rounded" />
        
//         <button disabled={loading} className="w-full bg-blue-600 p-2 rounded hover:bg-blue-500">
//           {loading ? "Creating..." : "Sign Up"}
//         </button>
//       </form>
//     </div>
//   );
// }

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        router.push("/login");
      } else {
        const data = await res.json();
        setError(data.error || "Registration failed");
      }
    } catch (err) {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-black selection:bg-green-500/30">
      {/* THEME BACKGROUND (Same as Login) */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#059669_0%,#000000_60%)] opacity-80" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      {/* CARD */}
      <div className="relative z-10 w-full max-w-md space-y-8 rounded-2xl bg-black/40 p-10 backdrop-blur-xl border border-white/10 shadow-2xl ring-1 ring-white/5">
        <div className="text-center">
          <div className="flex items-end justify-center mb-4">
            <img src="/logo.png" alt="Vignova Logo" width={56} height={56} className="w-14 h-14 object-contain" />
            <span className="text-3xl font-bold text-white tracking-tight -ml-2 mb-0.5">VIGNOVA</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Create Account
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-green-400 hover:text-green-300 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="full-name" className="sr-only">
                Full Name
              </label>
              <input
                id="full-name"
                name="fullName"
                type="text"
                required
                className="relative block w-full rounded-lg border border-white/10 bg-black/50 py-3 px-4 text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 sm:text-sm sm:leading-6 transition-all"
                placeholder="Full Name"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
              />
            </div>
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                className="relative block w-full rounded-lg border border-white/10 bg-black/50 py-3 px-4 text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 sm:text-sm sm:leading-6 transition-all"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="relative block w-full rounded-lg border border-white/10 bg-black/50 py-3 px-4 text-white placeholder:text-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 sm:text-sm sm:leading-6 transition-all"
                placeholder="Password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3">
              <p className="text-sm text-red-400 text-center font-medium">
                {error}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full justify-center rounded-lg bg-green-600 px-3 py-3 text-sm font-semibold text-white hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(22,163,74,0.3)] hover:shadow-[0_0_30px_rgba(22,163,74,0.5)]"
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}