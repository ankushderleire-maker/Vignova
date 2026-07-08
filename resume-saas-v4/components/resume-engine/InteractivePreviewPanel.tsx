"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ResumeData } from '@/types/resume';
import { DesignSettings } from '@/components/resume-engine/DesignControls';

// A4 natural pixel width at 96 DPI (210mm)
const A4_WIDTH_PX = 794;

interface SelectedSection {
    id: string;
    element: HTMLElement;
    type: 'name' | 'jobTitle' | 'email' | 'phone' | 'summary' | 'experience' | 'other';
}

interface InteractivePreviewPanelProps {
    data: ResumeData;
    templateId: string;
    designSettings?: DesignSettings;
    onDataChange: (newData: ResumeData) => void;
}

export const InteractivePreviewPanel: React.FC<InteractivePreviewPanelProps> = ({
    data,
    templateId,
    designSettings,
    onDataChange
}) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedSection, setSelectedSection] = useState<SelectedSection | null>(null);

    // ── Responsive scaling ────────────────────────────────────────────────
    const [containerWidth, setContainerWidth] = useState(550);
    // Scale so the A4 page fills the container width (8px padding each side)
    const fitScale = Math.min(1, Math.max(0.25, (containerWidth - 16) / A4_WIDTH_PX));

    // User-adjustable offset from fitScale (1.0 = fit-to-width)
    const [userScale, setUserScale] = useState(1.0);
    const effectiveScale = fitScale * userScale;

    // Measured iframe content height (updated after pagination runs)
    const [iframeContentHeight, setIframeContentHeight] = useState(1123); // 1 A4 page

    // ── Pinch-to-zoom (non-passive touch handler on the DOM directly) ─────
    const pinchRef = useRef<{ dist: number; startUserScale: number } | null>(null);

    const getPinchDist = (t: TouchList) =>
        Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const onTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                pinchRef.current = {
                    dist: getPinchDist(e.touches),
                    startUserScale: userScale,
                };
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 2 && pinchRef.current) {
                e.preventDefault(); // stop page scroll during pinch
                const ratio = getPinchDist(e.touches) / pinchRef.current.dist;
                const next = Math.max(0.6, Math.min(3.0, pinchRef.current.startUserScale * ratio));
                setUserScale(next);
            }
        };

        const onTouchEnd = () => { pinchRef.current = null; };

        el.addEventListener('touchstart', onTouchStart, { passive: true });
        el.addEventListener('touchmove', onTouchMove, { passive: false });
        el.addEventListener('touchend', onTouchEnd, { passive: true });

        return () => {
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('touchend', onTouchEnd);
        };
    }, [userScale]);

    // ── ResizeObserver — recalculate fitScale when panel resizes ──────────
    useEffect(() => {
        if (!containerRef.current) return;
        const ro = new ResizeObserver(([entry]) => {
            setContainerWidth(entry.contentRect.width);
            setUserScale(1.0); // reset zoom on resize
        });
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, []);

    // ── Read iframe content height after pagination runs ──────────────────
    const readIframeHeight = useCallback(() => {
        // Pagination script runs at 200ms after window.onload; give it 700ms total
        setTimeout(() => {
            try {
                if (iframeRef.current?.contentDocument?.body) {
                    const h = iframeRef.current.contentDocument.body.scrollHeight;
                    if (h > 200) setIframeContentHeight(h);
                }
            } catch (_) {}
        }, 700);
    }, []);

    // ── HTML generation (unchanged) ───────────────────────────────────────
    const generateHtml = useCallback(() => {
        const { getTemplateGenerator } = require('@/components/resume-html-templates');
        const generator = getTemplateGenerator(templateId);
        let html = generator(data, designSettings);

        const interactiveStyles = `
            <style>
                [data-editable] {
                    position: relative;
                    transition: all 0.2s ease;
                    cursor: pointer;
                    border-radius: 2px;
                }
                [data-editable]:hover {
                    outline: 2px dashed #3b82f6 !important;
                    outline-offset: 4px;
                    background: rgba(59, 130, 246, 0.05) !important;
                }
                [data-editable].selected {
                    outline: 2px solid #3b82f6 !important;
                    outline-offset: 4px;
                    background: rgba(59, 130, 246, 0.1) !important;
                }
                [contenteditable="true"] { outline: none; }
                [contenteditable="true"]:focus {
                    outline: 2px solid #10b981 !important;
                    outline-offset: 2px;
                }
                [data-editable]:not([contenteditable="true"]) { user-select: none; }
                [contenteditable="true"] { user-select: text; }
            </style>
        `;

        const interactiveScript = `
            <script>
                let selectedElement = null;
                document.addEventListener('click', (e) => {
                    const link = e.target.closest('a');
                    if (link) { e.preventDefault(); window.open(link.href, '_blank'); return; }
                    const editable = e.target.closest('[data-editable]');
                    if (editable) {
                        e.preventDefault(); e.stopPropagation();
                        if (selectedElement && selectedElement !== editable) {
                            selectedElement.classList.remove('selected');
                            selectedElement.removeAttribute('contenteditable');
                        }
                        editable.classList.add('selected');
                        selectedElement = editable;
                        const rect = editable.getBoundingClientRect();
                        window.parent.postMessage({
                            type: 'SECTION_SELECTED',
                            sectionId: editable.getAttribute('data-editable'),
                            position: { x: rect.left + rect.width / 2, y: rect.top },
                            formatting: {
                                bold: window.getComputedStyle(editable).fontWeight === '700' || window.getComputedStyle(editable).fontWeight === 'bold',
                                italic: window.getComputedStyle(editable).fontStyle === 'italic',
                                underline: window.getComputedStyle(editable).textDecoration.includes('underline'),
                                fontFamily: window.getComputedStyle(editable).fontFamily,
                                fontSize: parseInt(window.getComputedStyle(editable).fontSize),
                                alignment: window.getComputedStyle(editable).textAlign
                            }
                        }, '*');
                    } else if (!e.target.closest('[contenteditable="true"]')) {
                        if (selectedElement) {
                            selectedElement.classList.remove('selected');
                            selectedElement.removeAttribute('contenteditable');
                            selectedElement = null;
                        }
                        window.parent.postMessage({ type: 'SECTION_DESELECTED' }, '*');
                    }
                });
                document.addEventListener('dblclick', (e) => {
                    // Double click edit removed as requested
                });
                document.addEventListener('input', (e) => {
                    const editable = e.target.closest('[data-editable]');
                    if (editable) {
                        window.parent.postMessage({
                            type: 'CONTENT_CHANGED',
                            sectionId: editable.getAttribute('data-editable'),
                            content: editable.innerHTML
                        }, '*');
                    }
                });
                document.addEventListener('keydown', (e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); document.execCommand('bold'); }
                    else if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); document.execCommand('italic'); }
                    else if ((e.ctrlKey || e.metaKey) && e.key === 'u') { e.preventDefault(); document.execCommand('underline'); }
                    else if (e.key === 'Escape') {
                        if (selectedElement) {
                            selectedElement.classList.remove('selected');
                            selectedElement.removeAttribute('contenteditable');
                            selectedElement = null;
                        }
                        window.parent.postMessage({ type: 'SECTION_DESELECTED' }, '*');
                    }
                });
                window.addEventListener('message', (e) => {
                    if (e.data.type === 'APPLY_FORMATTING' && selectedElement) {
                        const { formatting } = e.data;
                        if (formatting.bold !== undefined) selectedElement.style.fontWeight = formatting.bold ? 'bold' : 'normal';
                        if (formatting.italic !== undefined) selectedElement.style.fontStyle = formatting.italic ? 'italic' : 'normal';
                        if (formatting.underline !== undefined) selectedElement.style.textDecoration = formatting.underline ? 'underline' : 'none';
                        if (formatting.fontFamily) selectedElement.style.fontFamily = formatting.fontFamily;
                        if (formatting.fontSize) selectedElement.style.fontSize = formatting.fontSize + 'px';
                        if (formatting.alignment) selectedElement.style.textAlign = formatting.alignment;
                    }
                });
            </script>
        `;

        const paginationScript = `
            <script>
                function runPagination() {
                    const measureDiv = document.createElement('div');
                    measureDiv.style.height = '297mm';
                    measureDiv.style.position = 'absolute';
                    measureDiv.style.visibility = 'hidden';
                    document.body.appendChild(measureDiv);
                    const PAGE_HEIGHT = measureDiv.offsetHeight - 1;
                    document.body.removeChild(measureDiv);

                    const root = document.body;
                    const originalPage = document.querySelector('.resume-page');
                    if (!originalPage) return;

                    originalPage.querySelectorAll('*').forEach(el => { el.style.minHeight = 'auto'; });
                    const pageTemplate = originalPage.cloneNode(false);
                    let wrapperTemplate = null;
                    let sidebarElement = null;
                    let mainTemplate = null;
                    let preservedElements = [];
                    let mainComesFirst = false;
                    let topChildren = Array.from(originalPage.children);

                    for (let i = 0; i < topChildren.length; i++) {
                        const child = topChildren[i];
                        if (child.children.length > 0 && child.tagName !== 'SECTION' && child.tagName !== 'HEADER') {
                            const childChildren = Array.from(child.children);
                            const aside = childChildren.find(c => c.tagName === 'ASIDE');
                            const main = childChildren.find(c => c.tagName === 'MAIN');
                            if (aside && main) {
                                wrapperTemplate = child; sidebarElement = aside; mainTemplate = main;
                                const asideIdx = childChildren.indexOf(aside);
                                const mainIdx = childChildren.indexOf(main);
                                mainComesFirst = mainIdx < asideIdx;
                                preservedElements = topChildren.slice(0, i);
                                topChildren = Array.from(main.children);
                                break;
                            }
                        }
                    }
                    if (!wrapperTemplate && topChildren.length === 1 && topChildren[0].children.length > 0 && topChildren[0].tagName !== 'SECTION' && topChildren[0].tagName !== 'HEADER') {
                        wrapperTemplate = topChildren[0];
                        topChildren = Array.from(wrapperTemplate.children);
                    }

                    root.innerHTML = '';
                    let currentPage = pageTemplate.cloneNode(false);
                    currentPage.classList.add('page-1');
                    currentPage.style.height = 'auto'; currentPage.style.minHeight = 'auto'; currentPage.style.overflow = 'visible';
                    root.appendChild(currentPage);
                    preservedElements.forEach(el => { currentPage.appendChild(el); });
                    let preservedHeight = 0;
                    preservedElements.forEach(el => { preservedHeight += el.offsetHeight || 0; });

                    let currentWrapper = currentPage;
                    if (wrapperTemplate) {
                        const w = wrapperTemplate.cloneNode(false); w.style.minHeight = 'auto'; currentPage.appendChild(w);
                        if (sidebarElement && mainTemplate) {
                            const availableHeight = PAGE_HEIGHT - preservedHeight;
                            sidebarElement.style.maxHeight = availableHeight + 'px'; sidebarElement.style.overflow = 'hidden';
                            const m = mainTemplate.cloneNode(false); m.style.minHeight = 'auto';
                            if (mainComesFirst) { w.appendChild(m); w.appendChild(sidebarElement); } else { w.appendChild(sidebarElement); w.appendChild(m); }
                            currentWrapper = m;
                        } else { currentWrapper = w; }
                    }

                    function createNewPage() {
                        const page = pageTemplate.cloneNode(false);
                        page.style.marginTop = '20px'; page.style.height = 'auto'; page.style.minHeight = 'auto'; page.style.overflow = 'visible';
                        root.appendChild(page); return page;
                    }
                    function createNewPageWithWrapper() {
                        const page = createNewPage();
                        if (wrapperTemplate) {
                            const w = wrapperTemplate.cloneNode(false); w.style.minHeight = 'auto'; page.appendChild(w);
                            if (sidebarElement && mainTemplate) {
                                const sp = sidebarElement.cloneNode(false); sp.innerHTML = ''; sp.style.visibility = 'hidden'; sp.style.maxHeight = '0'; sp.style.overflow = 'hidden'; sp.style.padding = '0';
                                const m = mainTemplate.cloneNode(false); m.style.minHeight = 'auto';
                                if (mainComesFirst) { w.appendChild(m); w.appendChild(sp); } else { w.appendChild(sp); w.appendChild(m); }
                                currentWrapper = m;
                            } else { currentWrapper = w; }
                        } else { currentWrapper = page; }
                        return page;
                    }
                    function finalizePage(page) { page.style.height = '297mm'; page.style.minHeight = '297mm'; page.style.overflow = 'hidden'; }
                    function reopenPage(page) { page.style.height = 'auto'; page.style.minHeight = 'auto'; page.style.overflow = 'visible'; }
                    function canSplit(el) {
                        if (el.tagName === 'SECTION' || el.classList.contains('section')) return true;
                        if (el.tagName === 'MAIN' || el.tagName === 'ASIDE') return true;
                        return el.children.length > 0 && !el.classList.contains('no-break');
                    }

                    topChildren.forEach(child => {
                        currentWrapper.appendChild(child);
                        if (currentPage.scrollHeight > PAGE_HEIGHT) {
                            currentWrapper.removeChild(child);
                            if (canSplit(child)) {
                                finalizePage(currentPage);
                                const wrapperCurrent = child.cloneNode(false); wrapperCurrent.style.marginBottom = '0'; wrapperCurrent.style.paddingBottom = '0'; currentWrapper.appendChild(wrapperCurrent); reopenPage(currentPage);
                                const subItems = Array.from(child.children);
                                let movedToNextPage = false; let wrapperNext = null;
                                subItems.forEach(subItem => {
                                    if (!movedToNextPage) {
                                        wrapperCurrent.appendChild(subItem);
                                        if (currentPage.scrollHeight > PAGE_HEIGHT) {
                                            wrapperCurrent.removeChild(subItem);
                                            const subChildren = Array.from(subItem.children);
                                            const deepSplitCandidates = subChildren.filter(c => c.classList.contains('description') || c.classList.contains('text-wrap') || c.tagName === 'UL' || c.tagName === 'OL');
                                            if (deepSplitCandidates.length > 0) {
                                                const itemWrapperCurrent = subItem.cloneNode(false); itemWrapperCurrent.style.marginBottom = '0'; wrapperCurrent.appendChild(itemWrapperCurrent);
                                                let deepMoved = false; let itemWrapperNext = null;
                                                subChildren.forEach(deepChild => {
                                                    if (!deepMoved) {
                                                        itemWrapperCurrent.appendChild(deepChild);
                                                        if (currentPage.scrollHeight > PAGE_HEIGHT) {
                                                            itemWrapperCurrent.removeChild(deepChild);
                                                            if (deepChild.children.length > 0) {
                                                                const textLines = Array.from(deepChild.children);
                                                                const lineWrapperCurrent = deepChild.cloneNode(false); lineWrapperCurrent.style.marginBottom = '0'; itemWrapperCurrent.appendChild(lineWrapperCurrent);
                                                                let lineMoved = false; let lineWrapperNext = null;
                                                                textLines.forEach(line => {
                                                                    if (!lineMoved) {
                                                                        if (line.tagName === 'UL' || line.tagName === 'OL') {
                                                                            const listWrapperCurrent = line.cloneNode(false); listWrapperCurrent.style.marginBottom = '0'; lineWrapperCurrent.appendChild(listWrapperCurrent);
                                                                            const listItems = Array.from(line.children); let listMoved = false; let listWrapperNext = null;
                                                                            listItems.forEach(li => {
                                                                                if (!listMoved) {
                                                                                    listWrapperCurrent.appendChild(li);
                                                                                    if (currentPage.scrollHeight > PAGE_HEIGHT) {
                                                                                        listWrapperCurrent.removeChild(li); listMoved = true; lineMoved = true; deepMoved = true; movedToNextPage = true;
                                                                                        finalizePage(currentPage); currentPage = createNewPageWithWrapper();
                                                                                        wrapperNext = child.cloneNode(false); currentWrapper.appendChild(wrapperNext);
                                                                                        itemWrapperNext = subItem.cloneNode(false); wrapperNext.appendChild(itemWrapperNext);
                                                                                        lineWrapperNext = deepChild.cloneNode(false); itemWrapperNext.appendChild(lineWrapperNext);
                                                                                        listWrapperNext = line.cloneNode(false); lineWrapperNext.appendChild(listWrapperNext);
                                                                                        listWrapperNext.appendChild(li);
                                                                                    }
                                                                                } else {
                                                                                    listWrapperNext.appendChild(li);
                                                                                    if (currentPage.scrollHeight > PAGE_HEIGHT) {
                                                                                        listWrapperNext.removeChild(li); finalizePage(currentPage); currentPage = createNewPageWithWrapper();
                                                                                        wrapperNext = child.cloneNode(false); currentWrapper.appendChild(wrapperNext);
                                                                                        itemWrapperNext = subItem.cloneNode(false); wrapperNext.appendChild(itemWrapperNext);
                                                                                        lineWrapperNext = deepChild.cloneNode(false); itemWrapperNext.appendChild(lineWrapperNext);
                                                                                        listWrapperNext = line.cloneNode(false); lineWrapperNext.appendChild(listWrapperNext);
                                                                                        listWrapperNext.appendChild(li);
                                                                                    }
                                                                                }
                                                                            });
                                                                            if (listWrapperCurrent.children.length === 0) lineWrapperCurrent.removeChild(listWrapperCurrent);
                                                                        } else {
                                                                            lineWrapperCurrent.appendChild(line);
                                                                            if (currentPage.scrollHeight > PAGE_HEIGHT) {
                                                                                lineWrapperCurrent.removeChild(line); lineMoved = true; deepMoved = true; movedToNextPage = true;
                                                                                finalizePage(currentPage); currentPage = createNewPageWithWrapper();
                                                                                wrapperNext = child.cloneNode(false); currentWrapper.appendChild(wrapperNext);
                                                                                itemWrapperNext = subItem.cloneNode(false); wrapperNext.appendChild(itemWrapperNext);
                                                                                lineWrapperNext = deepChild.cloneNode(false); itemWrapperNext.appendChild(lineWrapperNext);
                                                                                lineWrapperNext.appendChild(line);
                                                                            }
                                                                        }
                                                                    } else {
                                                                        lineWrapperNext.appendChild(line);
                                                                        if (currentPage.scrollHeight > PAGE_HEIGHT) {
                                                                            lineWrapperNext.removeChild(line); finalizePage(currentPage); currentPage = createNewPageWithWrapper();
                                                                            wrapperNext = child.cloneNode(false); currentWrapper.appendChild(wrapperNext);
                                                                            itemWrapperNext = subItem.cloneNode(false); wrapperNext.appendChild(itemWrapperNext);
                                                                            lineWrapperNext = deepChild.cloneNode(false); itemWrapperNext.appendChild(lineWrapperNext);
                                                                            lineWrapperNext.appendChild(line);
                                                                        }
                                                                    }
                                                                });
                                                                if (lineWrapperCurrent.children.length === 0) itemWrapperCurrent.removeChild(lineWrapperCurrent);
                                                            } else {
                                                                deepMoved = true; movedToNextPage = true;
                                                                finalizePage(currentPage); currentPage = createNewPageWithWrapper();
                                                                wrapperNext = child.cloneNode(false); currentWrapper.appendChild(wrapperNext);
                                                                itemWrapperNext = subItem.cloneNode(false); wrapperNext.appendChild(itemWrapperNext);
                                                                itemWrapperNext.appendChild(deepChild);
                                                            }
                                                        }
                                                    } else {
                                                        itemWrapperNext.appendChild(deepChild);
                                                        if (currentPage.scrollHeight > PAGE_HEIGHT) {
                                                            itemWrapperNext.removeChild(deepChild); finalizePage(currentPage); currentPage = createNewPageWithWrapper();
                                                            wrapperNext = child.cloneNode(false); currentWrapper.appendChild(wrapperNext);
                                                            itemWrapperNext = subItem.cloneNode(false); wrapperNext.appendChild(itemWrapperNext);
                                                            itemWrapperNext.appendChild(deepChild);
                                                        }
                                                    }
                                                });
                                                if (itemWrapperCurrent.children.length === 0) wrapperCurrent.removeChild(itemWrapperCurrent);
                                            } else if (canSplit(subItem)) {
                                                const containerCurrent = subItem.cloneNode(false); containerCurrent.style.marginBottom = '0'; wrapperCurrent.appendChild(containerCurrent);
                                                let containerMoved = false; let containerNext = null;
                                                const containerChildren = Array.from(subItem.children);
                                                containerChildren.forEach(cc => {
                                                    if (!containerMoved) {
                                                        containerCurrent.appendChild(cc);
                                                        if (currentPage.scrollHeight > PAGE_HEIGHT) {
                                                            containerCurrent.removeChild(cc); containerMoved = true; movedToNextPage = true;
                                                            finalizePage(currentPage); currentPage = createNewPageWithWrapper();
                                                            wrapperNext = child.cloneNode(false); currentWrapper.appendChild(wrapperNext);
                                                            containerNext = subItem.cloneNode(false); wrapperNext.appendChild(containerNext);
                                                            containerNext.appendChild(cc);
                                                        }
                                                    } else {
                                                        containerNext.appendChild(cc);
                                                        if (currentPage.scrollHeight > PAGE_HEIGHT) {
                                                            containerNext.removeChild(cc); finalizePage(currentPage); currentPage = createNewPageWithWrapper();
                                                            wrapperNext = child.cloneNode(false); currentWrapper.appendChild(wrapperNext);
                                                            containerNext = subItem.cloneNode(false); wrapperNext.appendChild(containerNext);
                                                            containerNext.appendChild(cc);
                                                        }
                                                    }
                                                });
                                                if (containerCurrent.children.length === 0) wrapperCurrent.removeChild(containerCurrent);
                                            } else {
                                                movedToNextPage = true;
                                                finalizePage(currentPage); currentPage = createNewPageWithWrapper();
                                                wrapperNext = child.cloneNode(false); currentWrapper.appendChild(wrapperNext);
                                                wrapperNext.appendChild(subItem);
                                            }
                                        }
                                    } else {
                                        wrapperNext.appendChild(subItem);
                                        if (currentPage.scrollHeight > PAGE_HEIGHT) {
                                            wrapperNext.removeChild(subItem); finalizePage(currentPage); currentPage = createNewPageWithWrapper();
                                            wrapperNext = child.cloneNode(false); currentWrapper.appendChild(wrapperNext);
                                            wrapperNext.appendChild(subItem);
                                        }
                                    }
                                });
                                if (wrapperCurrent.children.length === 0) { currentWrapper.removeChild(wrapperCurrent); }
                            } else {
                                finalizePage(currentPage); currentPage = createNewPageWithWrapper(); currentWrapper.appendChild(child);
                            }
                        }
                    });

                    const allPages = root.querySelectorAll('[class*="template"], .resume-page');
                    if (allPages.length > 0) { allPages.forEach(page => finalizePage(page)); } else { Array.from(root.children).forEach(page => finalizePage(page)); }
                }
                window.onload = () => { setTimeout(runPagination, 200); };
            </script>
        `;

        const headInjection = '<base target="_blank" />';
        if (html.includes('<head>')) {
            html = html.replace('<head>', `<head>${headInjection}`);
        } else {
            html = `${headInjection}${html}`;
        }

        html = html.replace('</body>', `${interactiveStyles}${interactiveScript}${paginationScript}</body>`);
        return html;
    }, [data, templateId, designSettings]);

    // ── Message handler from iframe ───────────────────────────────────────
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const { type, sectionId, content, styles } = event.data;
            switch (type) {
                case 'SECTION_SELECTED':
                    setSelectedSection({ id: sectionId, element: null as any, type: sectionId as any });
                    break;
                case 'SECTION_DESELECTED':
                    setSelectedSection(null);
                    break;
                case 'CONTENT_CHANGED':
                    handleContentChange(sectionId, content, styles);
                    break;
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [data]);

    const handleContentChange = (sectionId: string, content: string, styles?: any) => {
        const newData = { ...data };
        const cleanContent = content.replace(/<[^>]*>/g, '');
        if (sectionId === 'fullName') newData.fullName = cleanContent;
        else if (sectionId === 'jobTitle') newData.jobTitle = cleanContent;
        else if (sectionId === 'email') newData.contact.email = cleanContent;
        else if (sectionId === 'phone') newData.contact.phone = cleanContent;
        else if (sectionId === 'location') newData.contact.location = cleanContent;
        else if (sectionId === 'linkedin') newData.contact.linkedin = cleanContent;
        else if (sectionId === 'website') newData.contact.website = cleanContent;
        else if (sectionId === 'summary') newData.summary = cleanContent;
        else if (sectionId.startsWith('experience-')) {
            const parts = sectionId.split('-');
            const index = parseInt(parts[1]);
            const field = parts[2];
            if (newData.experience?.[index]) {
                if (field === 'company') newData.experience[index].company = cleanContent;
                else if (field === 'role') newData.experience[index].role = cleanContent;
                else if (field === 'description') newData.experience[index].description = cleanContent as any;
            }
        } else if (sectionId.startsWith('education-')) {
            const parts = sectionId.split('-');
            const index = parseInt(parts[1]);
            const field = parts[2];
            if (newData.education?.[index]) {
                if (field === 'school') newData.education[index].school = cleanContent;
                else if (field === 'degree') newData.education[index].degree = cleanContent;
            }
        }
        onDataChange(newData);
    };

    // ── Blob URL management ───────────────────────────────────────────────
    const htmlContent = generateHtml();
    const [blobUrl, setBlobUrl] = useState('');
    const [initialUrl, setInitialUrl] = useState<string | null>(null);

    useEffect(() => {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        if (!initialUrl) setInitialUrl(url);
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.location.replace(url);
        }
        return () => URL.revokeObjectURL(url);
    }, [htmlContent]);

    // ── Render ────────────────────────────────────────────────────────────
    const scaledWidth = Math.round(A4_WIDTH_PX * effectiveScale);
    const scaledHeight = Math.round(iframeContentHeight * effectiveScale);

    return (
        <div
            ref={containerRef}
            className="w-full h-full"
            style={{
                overflowY: 'auto',
                overflowX: 'hidden',
                background: '#525659',
                // Allow single-finger scroll + let our pinch handler do zoom
                touchAction: 'pan-y',
            }}
        >
            {/* Centered scaled wrapper — the only element the user scrolls through */}
            <div
                style={{
                    width: scaledWidth,
                    height: scaledHeight + 16,
                    margin: '8px auto',
                    position: 'relative',
                    flexShrink: 0,
                }}
            >
                {blobUrl ? (
                    <iframe
                        ref={iframeRef}
                        src={initialUrl || ''}
                        title="Interactive Resume Preview"
                        onLoad={readIframeHeight}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            // Natural A4 size — CSS transform scales the visual output
                            width: `${A4_WIDTH_PX}px`,
                            height: `${iframeContentHeight}px`,
                            transform: `scale(${effectiveScale})`,
                            transformOrigin: 'top left',
                            border: 'none',
                            background: 'white',
                            display: 'block',
                        }}
                    />
                ) : (
                    <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                        Loading preview...
                    </div>
                )}
            </div>

            {/* Hint tooltip — only on desktop (touch users don't need click hints) */}
            {!selectedSection && blobUrl && (
                <div className="sticky bottom-4 hidden md:flex justify-center pointer-events-none z-10">
                    <div className="bg-black/80 text-white px-4 py-2 rounded-lg text-xs">
                        Click any section to select • Esc to deselect
                    </div>
                </div>
            )}

            {/* Mobile hint */}
            {blobUrl && (
                <div className="sticky bottom-4 flex md:hidden justify-center pointer-events-none z-10">
                    <div className="bg-black/75 text-white px-3 py-1.5 rounded-full text-[10px]">
                        Pinch to zoom • Scroll to read
                    </div>
                </div>
            )}
        </div>
    );
};
