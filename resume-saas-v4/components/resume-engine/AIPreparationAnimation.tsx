import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles, WandSparkles } from 'lucide-react';

/**
 * The waiting state while a resume is generated.
 *
 * Two things it deliberately does:
 *
 * 1. The captions cycle, but the three steps beneath advance monotonically.
 *    There is no real progress to report — generation is a single opaque
 *    request — so the steps are paced against elapsed time and stop at the last
 *    one rather than looping. A bar that resets to the beginning tells the user
 *    the work restarted, which it did not.
 * 2. The sheet behind is a recognisable resume, not an abstract shimmer, so it
 *    is obvious what is being built.
 */

// Kept short: the card is 290px wide with an icon and a spinner on it, so
// anything longer is truncated mid-word.
const CAPTIONS = [
    'Reading the job post…',
    'Matching your profile…',
    'Writing summary…',
    'Selecting skills…',
    'Rewriting experience…',
    'Checking ATS fit…',
];

const STEPS = ['Reading job post', 'Matching profile', 'Building resume'];

/** Roughly when each step should light up, in seconds. */
const STEP_AT = [0, 8, 20];

export const AIPreparationAnimation = () => {
    const [caption, setCaption] = useState(0);
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const captions = setInterval(() => setCaption((c) => (c + 1) % CAPTIONS.length), 2600);
        const clock = setInterval(() => setElapsed((s) => s + 1), 1000);
        return () => {
            clearInterval(captions);
            clearInterval(clock);
        };
    }, []);

    // Never goes backwards, and never claims the last step is finished.
    const reached = STEP_AT.reduce((acc, at, i) => (elapsed >= at ? i : acc), 0);

    const line = (w: string, key: string, delay = 0) => (
        <div
            key={key}
            className="h-[7px] rounded-full bg-[var(--border-color)]/70 animate-pulse"
            style={{ width: w, animationDelay: `${delay}ms` }}
        />
    );

    return (
        <div className="w-full flex flex-col items-center">
            <div className="relative w-[300px] h-[318px] mb-9" aria-hidden="true">
                {/* Soft halo, and a dashed ring that turns slowly behind the sheet. */}
                <div className="absolute inset-0 -m-10 rounded-full bg-[var(--primary)]/10 blur-3xl" />
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-x-2 inset-y-6 rounded-full border border-dashed border-[var(--primary)]/25"
                />

                <Sparkles className="absolute -left-1 top-24 w-5 h-5 text-[var(--primary)]/60" />
                <Sparkles className="absolute -right-1 top-40 w-4 h-4 text-[var(--primary)]/45" />
                <Sparkles className="absolute left-8 bottom-10 w-3.5 h-3.5 text-[var(--primary)]/35" />

                {/* The resume sheet */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-x-5 inset-y-0 rounded-2xl bg-[var(--sidebar-bg)] border border-[var(--border-color)] shadow-[0_24px_60px_-24px_rgba(38,22,84,0.35)] p-5 overflow-hidden"
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-extrabold tracking-[0.14em] bg-[linear-gradient(110deg,#861cf6_0%,#5141f5_45%,#157bdc_100%)] bg-clip-text text-transparent">
                            VIGNOVA
                        </span>
                        <span className="text-[9px] font-bold tracking-[0.2em] text-[var(--text-secondary)]/60">RESUME</span>
                    </div>

                    {/* Identity block */}
                    <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--border-color)]/70 shrink-0" />
                        <div className="flex-1 space-y-2 pt-1">
                            {line('72%', 'n1')}
                            {line('46%', 'n2', 120)}
                            <div className="flex gap-2 pt-1">
                                {line('38%', 'c1', 200)}
                                {line('30%', 'c2', 260)}
                            </div>
                        </div>
                    </div>

                    <SectionLabel>EXPERIENCE</SectionLabel>
                    <div className="space-y-2 mb-16">
                        {line('90%', 'e1', 300)}
                        {line('78%', 'e2', 360)}
                    </div>

                    <SectionLabel>SKILLS</SectionLabel>
                    <div className="space-y-2">
                        {line('96%', 's1', 420)}
                        {line('84%', 's2', 480)}
                        {line('66%', 's3', 540)}
                    </div>
                </motion.div>

                {/* The status card, floating over the sheet */}
                <motion.div
                    animate={{ y: [0, -7, 0] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[290px] rounded-2xl bg-[var(--sidebar-bg)] border border-[var(--border-color)] shadow-[0_18px_44px_-16px_rgba(38,22,84,0.4)] px-4 py-3.5 flex items-center gap-3.5"
                >
                    <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/12 flex items-center justify-center shrink-0">
                        <WandSparkles className="w-[22px] h-[22px] text-[var(--primary)]" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-bold text-[var(--foreground)] leading-tight">AI Preparation</div>
                        <div className="relative h-4 mt-0.5">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={caption}
                                    initial={{ y: 8, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: -8, opacity: 0 }}
                                    transition={{ duration: 0.28 }}
                                    className="absolute inset-0 text-[13px] text-[var(--primary)] font-medium truncate"
                                >
                                    {CAPTIONS[caption]}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>

                    <Loader2 className="w-5 h-5 text-[var(--primary)] animate-spin shrink-0" />
                </motion.div>
            </div>

            {/* Three steps, mirroring the extension overlay so both surfaces
                describe the same work the same way. */}
            <ol className="flex items-start justify-center w-full max-w-[400px] list-none m-0 p-0">
                {STEPS.map((label, i) => {
                    const done = i < reached;
                    const active = i === reached;
                    return (
                        <li key={label} className="relative flex-1 text-center">
                            {i > 0 && (
                                <span
                                    className={`absolute top-[13px] right-1/2 w-full h-[2px] transition-colors duration-500 ${
                                        done || active ? 'bg-[var(--primary)]' : 'bg-[var(--border-color)]'
                                    }`}
                                />
                            )}
                            <span
                                className={`relative z-10 block w-7 h-7 mx-auto mb-2.5 rounded-full border-[3px] box-border transition-colors duration-300 ${
                                    done
                                        ? 'bg-[var(--primary)] border-[var(--primary)]'
                                        : active
                                          ? 'bg-[var(--background)] border-[var(--primary)] border-t-transparent animate-spin'
                                          : 'bg-[var(--background)] border-[var(--border-color)]'
                                }`}
                            >
                                {done && (
                                    <svg viewBox="0 0 24 24" className="w-full h-full p-[3px]" fill="none" stroke="#fff" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4.5 12.5l5 5 10-11" />
                                    </svg>
                                )}
                            </span>
                            <span
                                className={`block text-[12.5px] font-bold leading-tight ${
                                    done || active ? 'text-[var(--foreground)]' : 'text-[var(--text-secondary)]'
                                }`}
                            >
                                {label}
                            </span>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
};

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-1.5 mb-2">
            <span className="w-1 h-3 rounded-full bg-[var(--primary)]/60" />
            <span className="text-[9px] font-extrabold tracking-[0.16em] text-[var(--text-secondary)]/80">{children}</span>
        </div>
    );
}
