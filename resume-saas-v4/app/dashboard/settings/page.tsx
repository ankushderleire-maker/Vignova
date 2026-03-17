"use client";

import { useTheme } from "@/components/providers/ThemeContext";
import { Check, Palette, Moon, Sun, Wine } from "lucide-react";

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();

    const themes = [
        {
            id: "light",
            name: "White (Day)",
            description: "Clean, ATS-friendly light mode.",
            icon: Sun,
            bgClass: "bg-white",
            borderClass: "border-gray-200"
        },
        {
            id: "dark",
            name: "Dark (Default)",
            description: "Sleek dark mode for focus.",
            icon: Moon,
            bgClass: "bg-[#0a0a0a]",
            borderClass: "border-white/10"
        },
        {
            id: "wine-dark",
            name: "Red Wine (Black)",
            description: "Burgundy accents on black.",
            icon: Wine,
            bgClass: "bg-[#0f0505]",
            borderClass: "border-rose-900/30"
        }
    ] as const;

    return (
        <div className="p-8 max-w-5xl mx-auto text-[var(--foreground)] animate-slide-down">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3 text-[var(--foreground)]">
                <Palette className="h-8 w-8 text-[var(--primary)]" />
                Appearance
            </h1>
            <p className="text-[var(--text-secondary)] mb-8">Customize how Vignova looks for you.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {themes.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        className={`relative group p-6 rounded-xl border-2 text-left transition-all duration-300 hover:scale-[1.02] ${theme === t.id
                            ? "border-[var(--primary)] shadow-[0_0_20px_rgba(0,0,0,0.3)] ring-2 ring-[var(--primary)]/20"
                            : "border-transparent hover:border-[var(--border-color)] shadow-none"
                            } ${t.bgClass}`}
                        style={{ backgroundColor: t.id.includes('light') && theme !== t.id ? '#f5f5f5' : undefined }} // Contrast for light preview
                    >
                        {theme === t.id && (
                            <div className="absolute top-3 right-3 bg-[var(--primary)] text-white rounded-full p-1 shadow-lg">
                                <Check className="h-4 w-4" />
                            </div>
                        )}

                        <div className={`h-12 w-12 rounded-lg flex items-center justify-center mb-4 ${t.id.includes("dark") ? "bg-white/10" : "bg-black/5"
                            }`}>
                            <t.icon className={`h-6 w-6 ${t.id === theme ? "text-[var(--primary)]" : "text-[var(--text-secondary)]/70"}`} />
                        </div>

                        <h3 className={`font-bold text-lg mb-1 ${t.id.includes("dark") ? "text-white" : "text-black"}`}>
                            {t.name}
                        </h3>
                        <p className={`text-xs ${t.id.includes("dark") ? "text-gray-400" : "text-gray-600"}`}>
                            {t.description}
                        </p>
                    </button>
                ))}
            </div>

            <div className="mt-12 p-6 rounded-xl border border-[var(--border-color)] bg-[var(--sidebar-bg)] shadow-md">
                <h3 className="font-bold text-lg mb-4 text-[var(--foreground)]">Preview</h3>
                <div className="flex gap-4">
                    <div className="w-1/3 h-32 rounded-lg bg-[var(--background)] border border-[var(--border-color)] flex items-center justify-center">
                        <span className="text-sm font-medium">Background</span>
                    </div>
                    <div className="w-1/3 h-32 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white shadow-lg">
                        <span className="text-sm font-bold">Primary</span>
                    </div>
                    <div className="w-1/3 h-32 rounded-lg bg-[var(--sidebar-bg)] border border-[var(--border-color)] flex items-center justify-center">
                        <span className="text-sm font-medium">Sidebar</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
