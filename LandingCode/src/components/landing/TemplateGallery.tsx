"use client";

import React, { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";

// --- Mock Data ---
const RAW_TEMPLATES = [
    {
        id: "executive",
        name: "Executive",
        json: `{\\n  "role": "CEO",\\n  "exp": "15 Years",\\n  "mgmt": "Level 5"\\n}`
    },
    {
        id: "tech",
        name: "Tech Lead",
        json: `{\\n  "stack": "React",\\n  "cloud": "AWS",\\n  "code": "Clean"\\n}`
    },
    {
        id: "creative",
        name: "Creative",
        json: `{\\n  "ui": "Figma",\\n  "ux": "Research",\\n  "award": "Gold"\\n}`
    },
    {
        id: "minimal",
        name: "Minimal",
        json: `{\\n  "font": "Sans",\\n  "space": "White",\\n  "ats": true\\n}`
    },
];

// 1. Create a "Base Set" that is wider than any screen (4 items * 3 = 12 items ~ 4000px width)
const BASE_SET = [...RAW_TEMPLATES, ...RAW_TEMPLATES, ...RAW_TEMPLATES];

// 2. Create the Stream by duplicating the Base Set (Buffer + Active + Buffer)
const STREAM_DATA = [...BASE_SET, ...BASE_SET, ...BASE_SET];

export const TemplateGallery = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const scannerCanvasRef = useRef<HTMLCanvasElement>(null);

    // Animation Refs
    const positionRef = useRef<number>(0);
    const speedRef = useRef<number>(0.8);
    const animFrameId = useRef<number>(0);

    const isInView = React.useMemo(() => {
        if (typeof window === 'undefined') return false;
        return true;
    }, []);

    // --- 1. Particle System (Blue themed) ---
    useEffect(() => {
        const canvas = scannerCanvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let particles: {
            x: number; y: number; vx: number; vy: number;
            size: number; alpha: number; life: number; color: string
        }[] = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = 450;
        };
        window.addEventListener("resize", resize);
        resize();

        let isRunning = false;
        let id: number;

        const animateScanner = () => {
            if (!isRunning) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const centerX = canvas.width / 2;

            // Laser Beam - Blue
            ctx.shadowBlur = 60;
            ctx.shadowColor = "#3b82f6";
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(centerX, 0);
            ctx.lineTo(centerX, canvas.height);
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Emit Particles
            for (let i = 0; i < 20; i++) {
                particles.push({
                    x: centerX,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 18,
                    vy: (Math.random() - 0.5) * 6,
                    size: Math.random() * 1.5 + 1.0,
                    alpha: 1,
                    life: Math.random() * 0.6 + 0.2,
                    color: Math.random() > 0.6 ? "#ffffff" : "#3b82f6"
                });
            }

            // Update Particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.02;
                p.alpha = p.life;

                if (p.life <= 0) {
                    particles.splice(i, 1);
                } else {
                    ctx.fillStyle = p.color;
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = p.color;
                    ctx.globalAlpha = p.alpha;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }
            ctx.globalAlpha = 1;
            id = requestAnimationFrame(animateScanner);
        };

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    if (!isRunning) {
                        isRunning = true;
                        id = requestAnimationFrame(animateScanner);
                    }
                } else {
                    isRunning = false;
                    cancelAnimationFrame(id);
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(container);

        return () => {
            window.removeEventListener("resize", resize);
            isRunning = false;
            cancelAnimationFrame(id);
            observer.disconnect();
        };
    }, []);

    // --- 2. Seamless Infinite Loop Logic (Left -> Right) ---
    useEffect(() => {
        const track = trackRef.current;
        const container = containerRef.current;
        if (!track || !container) return;

        const cardWidth = 300;
        const gap = 40;
        const itemFullWidth = cardWidth + gap;
        const singleSetWidth = itemFullWidth * BASE_SET.length;

        positionRef.current = -singleSetWidth;

        let isRunning = false;

        const loop = () => {
            if (!isRunning) return;

            positionRef.current += speedRef.current;

            if (positionRef.current >= 0) {
                positionRef.current = -singleSetWidth;
            }

            track.style.transform = `translate3d(${positionRef.current}px, 0, 0)`;

            const centerLine = window.innerWidth / 2;
            const cards = track.children;

            for (let i = 0; i < cards.length; i++) {
                const card = cards[i] as HTMLElement;
                const rect = card.getBoundingClientRect();

                if (rect.right < 0 || rect.left > window.innerWidth) continue;

                const cardLeft = rect.left;
                const relativePos = centerLine - cardLeft;
                let percent = (relativePos / cardWidth) * 100;
                percent = Math.max(0, Math.min(100, percent));

                const codeLayer = card.querySelector(".layer-code") as HTMLElement;
                const imgLayer = card.querySelector(".layer-image") as HTMLElement;

                if (codeLayer && imgLayer) {
                    codeLayer.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
                    imgLayer.style.clipPath = `inset(0 0 0 ${percent}%)`;
                }
            }

            animFrameId.current = requestAnimationFrame(loop);
        };

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    if (!isRunning) {
                        isRunning = true;
                        animFrameId.current = requestAnimationFrame(loop);
                    }
                } else {
                    isRunning = false;
                    cancelAnimationFrame(animFrameId.current);
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(container);

        return () => {
            isRunning = false;
            cancelAnimationFrame(animFrameId.current);
            observer.disconnect();
        };
    }, []);

    return (
        <section className="relative py-20 bg-slate-50 overflow-hidden flex flex-col items-center min-h-[700px]">

            {/* Header Info */}
            <div className="relative z-10 text-center mb-16 space-y-4 px-4">
                <div className="inline-flex items-center px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-600 text-xs font-medium mb-4">
                    <Sparkles className="w-3 h-3 mr-2" />
                    <span>Real-time Transformation</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
                    Raw Data to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">Masterpiece</span>
                </h2>
            </div>

            {/* --- SCANNER STAGE --- */}
            <div
                ref={containerRef}
                className="relative w-full h-[450px] flex items-center"
            >

                {/* CANVAS LAYER */}
                <canvas
                    ref={scannerCanvasRef}
                    className="absolute inset-0 pointer-events-none z-30"
                />

                {/* Labels */}
                <div className="absolute top-4 left-[calc(50%-140px)] text-blue-500/40 text-[10px] font-mono font-bold tracking-[0.2em] z-20 hidden md:block">

                </div>
                <div className="absolute top-4 left-[calc(50%+40px)] text-slate-400/40 text-[10px] font-mono font-bold tracking-[0.2em] z-20 hidden md:block">

                </div>

                {/* Moving Track */}
                <div
                    ref={trackRef}
                    className="flex gap-10 absolute left-0"
                    style={{ willChange: "transform" }}
                >
                    {STREAM_DATA.map((item, idx) => (
                        <div
                            key={`${item.id}-${idx}`}
                            className="relative w-[300px] h-[400px] shrink-0 rounded-xl overflow-hidden bg-white border-2 border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)]"
                        >

                            {/* --- LAYER 1: CODE (kept dark for contrast) --- */}
                            <div
                                className="layer-code absolute inset-0 bg-gradient-to-b from-blue-50/80 to-slate-50 p-6 z-20 flex flex-col border-r-2 border-blue-400/40"
                                style={{ willChange: 'clip-path' }}
                            >
                                <div className="flex items-center gap-2 mb-4 opacity-60">
                                    <div className="w-2 h-2 rounded-full bg-red-400" />
                                    <div className="w-2 h-2 rounded-full bg-yellow-400" />
                                    <div className="w-2 h-2 rounded-full bg-green-400" />
                                </div>
                                <div className="font-mono text-xs text-blue-600/80 leading-relaxed whitespace-pre-wrap">
                                    {item.json}
                                </div>
                                <div className="mt-4 font-mono text-[10px] text-blue-500/50 space-y-1">
                                    <div>0x0004F... &lt;alloc&gt;</div>
                                    <div>0x0014A... &lt;init&gt;</div>
                                </div>
                                <div className="mt-auto pt-4 border-t border-blue-200/50 flex justify-between items-center">
                                    <span className="text-[10px] text-slate-500 font-mono">STATUS:</span>
                                    <span className="text-[10px] text-blue-600 font-mono animate-pulse">PARSING...</span>
                                </div>
                            </div>

                            {/* --- LAYER 2: IMAGE --- */}
                            <div
                                className="layer-image absolute inset-0 bg-white z-10"
                                style={{ willChange: 'clip-path' }}
                            >
                                <img
                                    src={`/templates/${item.id}-thumb.png`}
                                    alt={item.name}
                                    loading="eager"
                                    className="w-full h-full object-cover object-top opacity-100"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent pointer-events-none z-10" />

                                <div className="absolute bottom-5 left-5 right-5 z-20">
                                    <div className="text-xs font-bold text-white mb-1 uppercase tracking-wider">{item.name}</div>
                                    <div className="h-0.5 w-full bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full w-full bg-blue-500" />
                                    </div>
                                </div>
                            </div>

                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
