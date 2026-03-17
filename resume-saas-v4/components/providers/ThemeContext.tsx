"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "wine-dark" | "wine-light";

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // Default to dark
    const [theme, setTheme] = useState<Theme>("dark");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Load from local storage
        const saved = localStorage.getItem("vignova-theme") as Theme;
        if (saved) {
            setTheme(saved);
        }
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        // Save to local storage
        localStorage.setItem("vignova-theme", theme);

        // Apply to document
        document.documentElement.setAttribute("data-theme", theme);

        // Handle class-based dark mode (Tailwind)
        if (theme === "dark" || theme === "wine-dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }

    }, [theme, mounted]);

    // Prevent hydration mismatch by rendering nothing until mounted
    // if (!mounted) return <>{children}</>; // THIS WAS THE BUG. It removed the provider.

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
