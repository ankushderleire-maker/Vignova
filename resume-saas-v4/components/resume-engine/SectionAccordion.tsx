"use client";

import { useMemo, useState } from "react";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { ChevronDown, GripVertical } from "lucide-react";

/**
 * The resume editor's section list: each section collapses, and the grip on the
 * left reorders it. The order is the order the sections appear in the resume,
 * so it lives on the resume data rather than in component state.
 */

export type EditorSection = {
    id: string;
    title: string;
    icon: React.ElementType;
    /** Rendered on the right of the header, e.g. "Improve with AI". */
    action?: React.ReactNode;
    body: React.ReactNode;
    /** Sections that can't be dragged (there is nothing above the header). */
    fixed?: boolean;
};

export function SectionAccordion({
    sections,
    order,
    onOrderChange,
}: {
    sections: EditorSection[];
    order: string[];
    onOrderChange: (next: string[]) => void;
}) {
    // Only sections the user has actually toggled are recorded; everything else
    // falls back to the default below, so the first section is open even when
    // the list arrives after the first render.
    const [open, setOpen] = useState<Record<string, boolean>>({});

    // `order` is the source of truth; anything new (a just-added custom section)
    // is appended so it can never go missing from the list.
    const ordered = useMemo(() => {
        const byId = new Map(sections.map((s) => [s.id, s]));
        const seen = new Set<string>();
        const out: EditorSection[] = [];
        for (const id of order) {
            const section = byId.get(id);
            if (section && !seen.has(id)) {
                out.push(section);
                seen.add(id);
            }
        }
        for (const section of sections) {
            if (!seen.has(section.id)) out.push(section);
        }
        return out;
    }, [sections, order]);

    const onDragEnd = (result: DropResult) => {
        if (!result.destination || result.destination.index === result.source.index) return;
        const ids = ordered.map((s) => s.id);
        const [moved] = ids.splice(result.source.index, 1);
        ids.splice(result.destination.index, 0, moved);
        onOrderChange(ids);
    };

    // The caller passes the state it rendered, because an untouched section's
    // effective state comes from the default, not from `open`.
    const toggle = (id: string, isOpen: boolean) => setOpen((prev) => ({ ...prev, [id]: !isOpen }));

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="resume-sections">
                {(dropProvided) => (
                    <div ref={dropProvided.innerRef} {...dropProvided.droppableProps}>
                        {ordered.map((section, index) => {
                            const Icon = section.icon;
                            const isOpen = open[section.id] ?? index === 0;

                            return (
                                <Draggable key={section.id} draggableId={section.id} index={index}>
                                    {(dragProvided, snapshot) => (
                                        <div
                                            ref={dragProvided.innerRef}
                                            {...dragProvided.draggableProps}
                                            className={`border-b border-[var(--border-color)] bg-[var(--background)] ${
                                                snapshot.isDragging
                                                    ? "rounded-lg border border-[var(--primary)]/40 shadow-lg"
                                                    : ""
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 px-1 py-3">
                                                <span
                                                    {...dragProvided.dragHandleProps}
                                                    aria-label={`Reorder ${section.title}`}
                                                    className="shrink-0 text-[var(--text-secondary)] hover:text-[var(--foreground)] cursor-grab active:cursor-grabbing p-0.5"
                                                >
                                                    <GripVertical className="w-4 h-4" />
                                                </span>

                                                <button
                                                    onClick={() => toggle(section.id, isOpen)}
                                                    aria-expanded={isOpen}
                                                    className="flex-1 min-w-0 flex items-center gap-2.5 text-left"
                                                >
                                                    <Icon className="w-4 h-4 text-[var(--primary)] shrink-0" />
                                                    <span className="text-sm font-bold text-[var(--foreground)] truncate">
                                                        {section.title}
                                                    </span>
                                                </button>

                                                {section.action}

                                                <button
                                                    onClick={() => toggle(section.id, isOpen)}
                                                    aria-label={isOpen ? `Collapse ${section.title}` : `Expand ${section.title}`}
                                                    className="shrink-0 p-1 rounded text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 transition"
                                                >
                                                    <ChevronDown
                                                        className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                                                    />
                                                </button>
                                            </div>

                                            {isOpen && <div className="pb-4 px-1">{section.body}</div>}
                                        </div>
                                    )}
                                </Draggable>
                            );
                        })}
                        {dropProvided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    );
}

export default SectionAccordion;
