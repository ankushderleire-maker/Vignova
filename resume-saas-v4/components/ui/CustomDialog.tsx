"use client";

import React from 'react';
import { X, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void;
    title: string;
    description: string | React.ReactNode;
    type?: 'alert' | 'confirm';
    variant?: 'default' | 'destructive' | 'success';
    confirmText?: string;
    cancelText?: string;
    loading?: boolean;
}

export function CustomDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    type = 'alert',
    variant = 'default',
    confirmText = 'OK',
    cancelText = 'Cancel',
    loading = false
}: DialogProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={type === 'alert' ? onClose : undefined}
            />

            {/* Dialog Panel */}
            <div className="relative bg-[var(--sidebar-bg)] border border-[var(--border-color)] w-full max-w-sm rounded-[24px] shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
                <div className="p-6">
                    <div className="flex gap-4">
                        <div className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-full mt-1 ${variant === 'destructive' ? 'bg-red-500/10 text-red-500' :
                                variant === 'success' ? 'bg-green-500/10 text-green-500' :
                                    'bg-[var(--primary)]/10 text-[var(--primary)]'
                            }`}>
                            {variant === 'destructive' ? <AlertTriangle className="w-5 h-5" /> :
                                variant === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
                                    <Info className="w-5 h-5" />}
                        </div>
                        <div className="space-y-1.5 flex-1 pt-1">
                            <h3 className="text-lg font-bold text-[var(--foreground)] tracking-tight leading-tight">
                                {title}
                            </h3>
                            <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                {description}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-black/20 dark:bg-white/5 px-6 py-4 flex items-center justify-end gap-3 rounded-b-[24px]">
                    {type === 'confirm' && (
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="px-5 py-2.5 rounded-xl text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (onConfirm) onConfirm();
                            if (type === 'alert' && !loading) onClose();
                        }}
                        disabled={loading}
                        className={`min-w-[100px] px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg flex items-center justify-center ${variant === 'destructive' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' :
                                variant === 'success' ? 'bg-green-500 hover:bg-green-600 shadow-green-500/20' :
                                    'bg-[var(--primary)] hover:bg-[var(--primary)]/90 shadow-[var(--primary)]/20'
                            } disabled:opacity-50`}
                    >
                        {loading ? (
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
