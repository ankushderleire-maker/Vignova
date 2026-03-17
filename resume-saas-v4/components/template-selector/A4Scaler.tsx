'use client';

import React, { useRef, useEffect, useState } from 'react';

interface A4ScalerProps {
    children: React.ReactNode;
    className?: string;
}

/**
 * A4 Scaler Component
 * Uses CSS transform: scale() to fit A4 content inside the container.
 * White paper with shadow against a gray background.
 */
export const A4Scaler: React.FC<A4ScalerProps> = ({ children, className = '' }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.6);

    useEffect(() => {
        const calculateScale = () => {
            if (!containerRef.current) return;

            const container = containerRef.current;
            const A4_WIDTH = 793.7;
            const A4_HEIGHT = 1122.5;

            // Available space after padding
            const padX = 40, padY = 40;
            const availW = container.clientWidth - padX * 2;
            const availH = container.clientHeight - padY * 2;

            if (availW <= 0 || availH <= 0) return;

            const s = Math.min(availW / A4_WIDTH, availH / A4_HEIGHT, 1);
            setScale(s);
        };

        calculateScale();

        const ro = new ResizeObserver(calculateScale);
        if (containerRef.current) ro.observe(containerRef.current);

        return () => ro.disconnect();
    }, []);

    return (
        <div
            ref={containerRef}
            className={`a4-scaler ${className}`}
            style={{
                width: '100%',
                height: '100%',
                overflow: 'auto',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                padding: '40px 40px',
                boxSizing: 'border-box',
            }}
        >
            <div
                style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'top center',
                    transition: 'transform 0.15s ease-out',
                    width: '793.7px',
                    minHeight: '1122.5px',
                    background: 'white',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
                    flexShrink: 0,
                }}
            >
                {children}
            </div>
        </div>
    );
};
