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
        <div className="flex border-b border-white/10 bg-[#0a0a0a]">
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
                flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-all
                ${active
                    ? 'text-white border-b-2 border-[#667eea] bg-white/5'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }
            `}
        >
            {icon}
            <span className="hidden sm:inline">{label}</span>
        </button>
    );
}
