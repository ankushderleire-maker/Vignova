'use client';

import React from 'react';
import { FileText, LayoutTemplate, Palette } from 'lucide-react';

export type SidebarTab = 'content' | 'templates';

interface SidebarTabBarProps {
    activeTab: SidebarTab;
    onTabChange: (tab: SidebarTab) => void;
}

export function SidebarTabBar({ activeTab, onTabChange }: SidebarTabBarProps) {
    return (
        <div className="flex bg-[#130d26] pt-2 px-2 w-full">
            <TabButton
                active={activeTab === 'content'}
                onClick={() => onTabChange('content')}
                icon={<FileText className="h-4 w-4" />}
                label="Content"
            />
            <TabButton
                active={activeTab === 'templates'}
                onClick={() => onTabChange('templates')}
                icon={<LayoutTemplate className="h-4 w-4" />}
                label="Templates"
            />
        </div>
    );
}

function TabButton({ active, onClick, icon, label }: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}) {
    return (
        <button
            onClick={onClick}
            className={`
                flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold transition-all
                rounded-t-xl
                ${active
                    ? 'text-[var(--primary)] bg-white dark:bg-[#1e1e1e] border-none shadow-sm z-10'
                    : 'text-white/60 hover:text-white hover:bg-white/5 bg-transparent border-none'
                }
            `}
        >
            {icon}
            <span className="hidden sm:inline">{label}</span>
        </button>
    );
}
