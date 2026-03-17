// components/dashboard/ActionCard.tsx
"use client";

import { LucideIcon } from "lucide-react";
import styles from "./DashboardCard.module.css";
import Link from "next/link";

interface ActionCardProps {
    title: string;
    description: string;
    icon: LucideIcon;
    href: string;
    color: string;
}

export function ActionCard({ title, description, icon: Icon, href, color }: ActionCardProps) {
    return (
        <Link href={href} className={styles.cardWrapper} style={{ "--border-color": color, cursor: 'pointer' } as React.CSSProperties}>
            <div className={`${styles.innerCard} group`}>
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2 group-hover:text-[var(--primary)] transition-colors">
                            {title}
                        </h3>
                        <p className="text-[var(--text-secondary)] text-sm">
                            {description}
                        </p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors">
                        <Icon className="w-6 h-6" style={{ color }} />
                    </div>
                </div>
            </div>
        </Link>
    );
}
