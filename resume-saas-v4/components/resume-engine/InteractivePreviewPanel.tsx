"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ResumeData } from '@/types/resume';
import { DesignSettings } from '@/components/resume-engine/DesignControls';


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
    const [selectedSection, setSelectedSection] = useState<SelectedSection | null>(null);


    // Generate HTML content with interactive features
    const generateHtml = useCallback(() => {
        // Import the template generator
        const { getTemplateGenerator } = require('@/components/resume-html-templates');
        const generator = getTemplateGenerator(templateId);
        let html = generator(data, designSettings);

        // Inject interaction styles and scripts
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

                [contenteditable="true"] {
                    outline: none;
                }

                [contenteditable="true"]:focus {
                    outline: 2px solid #10b981 !important;
                    outline-offset: 2px;
                }

                /* Prevent text selection on hover, allow on edit */
                [data-editable]:not([contenteditable="true"]) {
                    user-select: none;
                }

                [contenteditable="true"] {
                    user-select: text;
                }
            </style>
        `;

        const interactiveScript = `
            <script>
                // Track selected element
                let selectedElement = null;

                // Handle section clicks
                document.addEventListener('click', (e) => {
                    // Prevent link navigation within iframe
                    const link = e.target.closest('a');
                    if (link) {
                        e.preventDefault();
                        window.open(link.href, '_blank');
                        return;
                    }

                    const editable = e.target.closest('[data-editable]');
                    
                    if (editable) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Deselect previous
                        if (selectedElement && selectedElement !== editable) {
                            selectedElement.classList.remove('selected');
                            selectedElement.removeAttribute('contenteditable');
                        }
                        
                        // Select new
                        editable.classList.add('selected');
                        selectedElement = editable;
                        
                        // Get position for toolbar
                        const rect = editable.getBoundingClientRect();
                        
                        // Send selection info to parent
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
                        // Click outside - deselect
                        if (selectedElement) {
                            selectedElement.classList.remove('selected');
                            selectedElement.removeAttribute('contenteditable');
                            selectedElement = null;
                        }
                        window.parent.postMessage({ type: 'SECTION_DESELECTED' }, '*');
                    }
                });

                // Enable editing on double-click
                document.addEventListener('dblclick', (e) => {
                    const editable = e.target.closest('[data-editable]');
                    if (editable) {
                        e.preventDefault();
                        editable.setAttribute('contenteditable', 'true');
                        editable.focus();
                        
                        // Select all text
                        const range = document.createRange();
                        range.selectNodeContents(editable);
                        const sel = window.getSelection();
                        sel.removeAllRanges();
                        sel.addRange(range);
                    }
                });

                // Send content changes
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

                // Handle keyboard shortcuts
                document.addEventListener('keydown', (e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                        e.preventDefault();
                        document.execCommand('bold');
                    } else if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
                        e.preventDefault();
                        document.execCommand('italic');
                    } else if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
                        e.preventDefault();
                        document.execCommand('underline');
                    } else if (e.key === 'Escape') {
                        if (selectedElement) {
                            selectedElement.classList.remove('selected');
                            selectedElement.removeAttribute('contenteditable');
                            selectedElement = null;
                        }
                        window.parent.postMessage({ type: 'SECTION_DESELECTED' }, '*');
                    }
                });

                // Listen for formatting commands from parent
                window.addEventListener('message', (e) => {
                    console.log('[IFRAME] Received message:', e.data);
                    
                    if (e.data.type === 'APPLY_FORMATTING') {
                        console.log('[IFRAME] Formatting command received');
                        console.log('[IFRAME] Selected element:', selectedElement);
                        
                        if (selectedElement) {
                            const { formatting } = e.data;
                            console.log('[IFRAME] Applying formatting:', formatting);
                            
                            if (formatting.bold !== undefined) {
                                selectedElement.style.fontWeight = formatting.bold ? 'bold' : 'normal';
                            }
                            if (formatting.italic !== undefined) {
                                selectedElement.style.fontStyle = formatting.italic ? 'italic' : 'normal';
                            }
                            if (formatting.underline !== undefined) {
                                selectedElement.style.textDecoration = formatting.underline ? 'underline' : 'none';
                            }
                            if (formatting.fontFamily) {
                                selectedElement.style.fontFamily = formatting.fontFamily;
                            }
                            if (formatting.fontSize) {
                                selectedElement.style.fontSize = formatting.fontSize + 'px';
                            }
                            if (formatting.alignment) {
                                selectedElement.style.textAlign = formatting.alignment;
                            }

                            console.log('[IFRAME] Applied styles:', {
                                fontWeight: selectedElement.style.fontWeight,
                                fontStyle: selectedElement.style.fontStyle,
                                textDecoration: selectedElement.style.textDecoration,
                                fontFamily: selectedElement.style.fontFamily,
                                fontSize: selectedElement.style.fontSize,
                                textAlign: selectedElement.style.textAlign
                            });

                            // DO NOT send CONTENT_CHANGED here!
                            // Formatting changes should not trigger iframe reload
                            // Only text editing should trigger content change
                            console.log('[IFRAME] Formatting applied successfully - NOT reloading iframe');
                        } else {
                            console.warn('[IFRAME] No element selected, cannot apply formatting');
                        }
                    }
                });
            </script>
        `;

        // Insert styles and script before </body>
        // Also inject <base target="_blank"> to force all links to open in new tab
        const headInjection = '<base target="_blank" />';
        if (html.includes('<head>')) {
            html = html.replace('<head>', `<head>${headInjection}`);
        } else {
            html = `${headInjection}${html}`;
        }

        // Check if we need to paginate (simple height check)
        // Check if we need to paginate (smart splitting logic)
        const paginationScript = `
            <script>
                function runPagination() {
                    // MEASURE EXACT A4 HEIGHT DYNAMICALLY
                    const measureDiv = document.createElement('div');
                    measureDiv.style.height = '297mm';
                    measureDiv.style.position = 'absolute';
                    measureDiv.style.visibility = 'hidden';
                    document.body.appendChild(measureDiv);
                    const PAGE_HEIGHT = measureDiv.offsetHeight - 1; // 1px safety
                    document.body.removeChild(measureDiv);
                    
                    console.log('Detected A4 Height (px):', PAGE_HEIGHT);

                    const root = document.body;
                    const originalPage = document.querySelector('.resume-page');
                    
                    if (!originalPage) return;
                    
                    // FIX: Strip min-height from ALL inner elements to prevent false overflow
                    // (e.g. .layout-grid { min-height: 297mm } in Professional template)
                    originalPage.querySelectorAll('*').forEach(el => {
                        el.style.minHeight = 'auto';
                    });

                    // Clone the page styling
                    const pageTemplate = originalPage.cloneNode(false);
                    
                    // --- Enhanced Wrapper Detection ---
                    // Supports templates with multiple top-level children, e.g.:
                    //   <header> + <div.layout-columns>  (Diamond, Executive)
                    //   <div.layout-grid>                (Corporate — single wrapper)
                    //   <header> + <section> + ...       (flat single-column templates)
                    let wrapperTemplate = null;
                    let sidebarElement = null;   // Sidebar stays on page 1
                    let mainTemplate = null;     // Main content area (we paginate its children)
                    let preservedElements = [];  // Elements placed on page 1 BEFORE the wrapper (e.g. headers)
                    let mainComesFirst = false;  // Track DOM order: does <main> come before <aside>?
                    let topChildren = Array.from(originalPage.children);
                    
                    // Scan ALL top-level children for a container that holds ASIDE + MAIN
                    for (let i = 0; i < topChildren.length; i++) {
                        const child = topChildren[i];
                        if (child.children.length > 0 && 
                            child.tagName !== 'SECTION' && child.tagName !== 'HEADER') {
                            const childChildren = Array.from(child.children);
                            const aside = childChildren.find(c => c.tagName === 'ASIDE');
                            const main = childChildren.find(c => c.tagName === 'MAIN');
                            
                            if (aside && main) {
                                // Found the multi-column wrapper!
                                wrapperTemplate = child;
                                sidebarElement = aside;
                                mainTemplate = main;
                                // Track original DOM order (main before aside, or aside before main)
                                const asideIdx = childChildren.indexOf(aside);
                                const mainIdx = childChildren.indexOf(main);
                                mainComesFirst = mainIdx < asideIdx;
                                // Everything before this wrapper = preserved (placed on page 1 only)
                                preservedElements = topChildren.slice(0, i);
                                // Content to paginate = main's children
                                topChildren = Array.from(main.children);
                                break;
                            }
                        }
                    }
                    
                    // Fallback: single wrapper (no ASIDE/MAIN but a lone container child)
                    if (!wrapperTemplate && topChildren.length === 1 && 
                        topChildren[0].children.length > 0 &&
                        topChildren[0].tagName !== 'SECTION' && topChildren[0].tagName !== 'HEADER') {
                        wrapperTemplate = topChildren[0];
                        topChildren = Array.from(wrapperTemplate.children);
                    }
                    
                    // Clear DOM
                    root.innerHTML = '';
                    
                    // Initialize Page 1
                    let currentPage = pageTemplate.cloneNode(false);
                    currentPage.classList.add('page-1');
                    currentPage.style.height = 'auto';
                    currentPage.style.minHeight = 'auto';
                    currentPage.style.overflow = 'visible';
                    root.appendChild(currentPage);
                    
                    // Place preserved elements (e.g. full-width header) on page 1
                    preservedElements.forEach(el => {
                        currentPage.appendChild(el);
                    });
                    
                    // Measure how much height preserved elements consume
                    // (so the sidebar doesn't fill the full page and leave main empty)
                    let preservedHeight = 0;
                    preservedElements.forEach(el => {
                        preservedHeight += el.offsetHeight || 0;
                    });
                    
                    // Set up wrapper + sidebar + main on page 1
                    let currentWrapper = currentPage;
                    if (wrapperTemplate) {
                        const w = wrapperTemplate.cloneNode(false);
                        w.style.minHeight = 'auto';
                        currentPage.appendChild(w);
                        
                        if (sidebarElement && mainTemplate) {
                            // Multi-column: place real sidebar + empty main shell
                            // CRITICAL: Constrain sidebar to available height AFTER header
                            const availableHeight = PAGE_HEIGHT - preservedHeight;
                            sidebarElement.style.maxHeight = availableHeight + 'px';
                            sidebarElement.style.overflow = 'hidden';
                            const m = mainTemplate.cloneNode(false);
                            m.style.minHeight = 'auto';
                            // PRESERVE ORIGINAL DOM ORDER (main first vs aside first)
                            if (mainComesFirst) {
                                w.appendChild(m);
                                w.appendChild(sidebarElement);
                            } else {
                                w.appendChild(sidebarElement);
                                w.appendChild(m);
                            }
                            currentWrapper = m; // Content goes INTO the main area
                        } else {
                            currentWrapper = w;
                        }
                    }
                    
                    function createNewPage() {
                        const page = pageTemplate.cloneNode(false);
                        page.style.marginTop = '20px';
                        page.style.height = 'auto';
                        page.style.minHeight = 'auto';
                        page.style.overflow = 'visible';
                        root.appendChild(page);
                        return page;
                    }
                    
                    function createNewPageWithWrapper() {
                        const page = createNewPage();
                        if (wrapperTemplate) {
                            const w = wrapperTemplate.cloneNode(false);
                            w.style.minHeight = 'auto';
                            page.appendChild(w);
                            
                            if (sidebarElement && mainTemplate) {
                                // Add invisible sidebar placeholder to preserve grid columns
                                // Use EMPTY clone so it takes column width but NO height
                                const sp = sidebarElement.cloneNode(false);
                                sp.innerHTML = '';
                                sp.style.visibility = 'hidden';
                                sp.style.maxHeight = '0';
                                sp.style.overflow = 'hidden';
                                sp.style.padding = '0';
                                
                                const m = mainTemplate.cloneNode(false);
                                m.style.minHeight = 'auto';
                                // PRESERVE ORIGINAL DOM ORDER on subsequent pages too
                                if (mainComesFirst) {
                                    w.appendChild(m);
                                    w.appendChild(sp);
                                } else {
                                    w.appendChild(sp);
                                    w.appendChild(m);
                                }
                                currentWrapper = m;
                            } else {
                                currentWrapper = w;
                            }
                        } else {
                            currentWrapper = page;
                        }
                        return page;
                    }
                    
                    function finalizePage(page) {
                        page.style.height = '297mm';
                        page.style.minHeight = '297mm';
                        page.style.overflow = 'hidden';
                    }
                    
                    function reopenPage(page) {
                        page.style.height = 'auto';
                        page.style.minHeight = 'auto';
                        page.style.overflow = 'visible';
                    }
                    
                    // Helper: check if element can be split
                    // Sections are ALWAYS splittable (we iterate their children).
                    // no-break only prevents splitting of leaf-level items WITHIN a section.
                    function canSplit(el) {
                        if (el.tagName === 'SECTION' || el.classList.contains('section')) return true;
                        if (el.tagName === 'MAIN' || el.tagName === 'ASIDE') return true;
                        return el.children.length > 0 && !el.classList.contains('no-break');
                    }

                    // Process Children Queue
                    topChildren.forEach(child => {
                        currentWrapper.appendChild(child);
                        
                        if (currentPage.scrollHeight > PAGE_HEIGHT) {
                            // Child caused overflow
                            currentWrapper.removeChild(child);
                            
                            // Can we split this child?
                            if (canSplit(child)) {
                                // LEVEL 1 SPLIT: Split container across pages
                                finalizePage(currentPage);
                                
                                const wrapperCurrent = child.cloneNode(false);
                                wrapperCurrent.style.marginBottom = '0';
                                wrapperCurrent.style.paddingBottom = '0';
                                currentWrapper.appendChild(wrapperCurrent);
                                reopenPage(currentPage);
                                
                                const subItems = Array.from(child.children);
                                let movedToNextPage = false;
                                let wrapperNext = null;
                                
                                subItems.forEach(subItem => {
                                    if (!movedToNextPage) {
                                        wrapperCurrent.appendChild(subItem);
                                        
                                        if (currentPage.scrollHeight > PAGE_HEIGHT) {
                                            wrapperCurrent.removeChild(subItem);
                                            
                                            // Can we split this subItem further?
                                            const subChildren = Array.from(subItem.children);
                                            const deepSplitCandidates = subChildren.filter(c => 
                                                c.classList.contains('description') || 
                                                c.classList.contains('text-wrap') || 
                                                c.tagName === 'UL' || 
                                                c.tagName === 'OL'
                                            );
                                            
                                            if (deepSplitCandidates.length > 0) {
                                                // LEVEL 3: Deep Split inside item (descriptions, lists)
                                                const itemWrapperCurrent = subItem.cloneNode(false);
                                                itemWrapperCurrent.style.marginBottom = '0';
                                                wrapperCurrent.appendChild(itemWrapperCurrent);
                                                
                                                let deepMoved = false;
                                                let itemWrapperNext = null;
                                                
                                                subChildren.forEach(deepChild => {
                                                    if (!deepMoved) {
                                                        itemWrapperCurrent.appendChild(deepChild);
                                                        
                                                        if (currentPage.scrollHeight > PAGE_HEIGHT) {
                                                            itemWrapperCurrent.removeChild(deepChild);
                                                            
                                                            if (deepChild.children.length > 0) {
                                                                const textLines = Array.from(deepChild.children);
                                                                const lineWrapperCurrent = deepChild.cloneNode(false);
                                                                lineWrapperCurrent.style.marginBottom = '0';
                                                                itemWrapperCurrent.appendChild(lineWrapperCurrent);
                                                                
                                                                let lineMoved = false;
                                                                let lineWrapperNext = null;
                                                                
                                                                textLines.forEach(line => {
                                                                    if (!lineMoved) {
                                                                        if (line.tagName === 'UL' || line.tagName === 'OL') {
                                                                            // LEVEL 4: Split list items
                                                                            const listWrapperCurrent = line.cloneNode(false);
                                                                            listWrapperCurrent.style.marginBottom = '0';
                                                                            lineWrapperCurrent.appendChild(listWrapperCurrent);
                                                                            
                                                                            const listItems = Array.from(line.children);
                                                                            let listMoved = false;
                                                                            let listWrapperNext = null;
                                                                            
                                                                            listItems.forEach(li => {
                                                                                if (!listMoved) {
                                                                                    listWrapperCurrent.appendChild(li);
                                                                                    if (currentPage.scrollHeight > PAGE_HEIGHT) {
                                                                                        listWrapperCurrent.removeChild(li);
                                                                                        listMoved = true; lineMoved = true; deepMoved = true; movedToNextPage = true;
                                                                                        finalizePage(currentPage);
                                                                                        currentPage = createNewPageWithWrapper();
                                                                                        wrapperNext = child.cloneNode(false); currentWrapper.appendChild(wrapperNext);
                                                                                        itemWrapperNext = subItem.cloneNode(false); wrapperNext.appendChild(itemWrapperNext);
                                                                                        lineWrapperNext = deepChild.cloneNode(false); itemWrapperNext.appendChild(lineWrapperNext);
                                                                                        listWrapperNext = line.cloneNode(false); lineWrapperNext.appendChild(listWrapperNext);
                                                                                        listWrapperNext.appendChild(li);
                                                                                    }
                                                                                } else {
                                                                                    listWrapperNext.appendChild(li);
                                                                                    if (currentPage.scrollHeight > PAGE_HEIGHT) {
                                                                                        listWrapperNext.removeChild(li);
                                                                                        finalizePage(currentPage);
                                                                                        currentPage = createNewPageWithWrapper();
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
                                                                            // Normal element (P, Div, etc.)
                                                                            lineWrapperCurrent.appendChild(line);
                                                                            if (currentPage.scrollHeight > PAGE_HEIGHT) {
                                                                                lineWrapperCurrent.removeChild(line);
                                                                                lineMoved = true; deepMoved = true; movedToNextPage = true;
                                                                                finalizePage(currentPage);
                                                                                currentPage = createNewPageWithWrapper();
                                                                                wrapperNext = child.cloneNode(false); currentWrapper.appendChild(wrapperNext);
                                                                                itemWrapperNext = subItem.cloneNode(false); wrapperNext.appendChild(itemWrapperNext);
                                                                                lineWrapperNext = deepChild.cloneNode(false); itemWrapperNext.appendChild(lineWrapperNext);
                                                                                lineWrapperNext.appendChild(line);
                                                                            }
                                                                        }
                                                                    } else {
                                                                        lineWrapperNext.appendChild(line);
                                                                        if (currentPage.scrollHeight > PAGE_HEIGHT) {
                                                                            lineWrapperNext.removeChild(line);
                                                                            finalizePage(currentPage);
                                                                            currentPage = createNewPageWithWrapper();
                                                                            wrapperNext = child.cloneNode(false); currentWrapper.appendChild(wrapperNext);
                                                                            itemWrapperNext = subItem.cloneNode(false); wrapperNext.appendChild(itemWrapperNext);
                                                                            lineWrapperNext = deepChild.cloneNode(false); itemWrapperNext.appendChild(lineWrapperNext);
                                                                            lineWrapperNext.appendChild(line);
                                                                        }
                                                                    }
                                                                });
                                                                if (lineWrapperCurrent.children.length === 0) itemWrapperCurrent.removeChild(lineWrapperCurrent);
                                                            } else {
                                                                // Solid block, move it
                                                                deepMoved = true; movedToNextPage = true;
                                                                finalizePage(currentPage);
                                                                currentPage = createNewPageWithWrapper();
                                                                wrapperNext = child.cloneNode(false); currentWrapper.appendChild(wrapperNext);
                                                                itemWrapperNext = subItem.cloneNode(false); wrapperNext.appendChild(itemWrapperNext);
                                                                itemWrapperNext.appendChild(deepChild);
                                                            }
                                                        }
                                                    } else {
                                                        itemWrapperNext.appendChild(deepChild);
                                                        if (currentPage.scrollHeight > PAGE_HEIGHT) {
                                                            itemWrapperNext.removeChild(deepChild);
                                                            finalizePage(currentPage);
                                                            currentPage = createNewPageWithWrapper();
                                                            wrapperNext = child.cloneNode(false); currentWrapper.appendChild(wrapperNext);
                                                            itemWrapperNext = subItem.cloneNode(false); wrapperNext.appendChild(itemWrapperNext);
                                                            itemWrapperNext.appendChild(deepChild);
                                                        }
                                                    }
                                                });
                                                if (itemWrapperCurrent.children.length === 0) wrapperCurrent.removeChild(itemWrapperCurrent);
                                                
                                            } else if (canSplit(subItem)) {
                                                // LEVEL 2 CONTAINER SPLIT: subItem is itself a container (like <main>)
                                                // Iterate its children and place them one by one
                                                const containerCurrent = subItem.cloneNode(false);
                                                containerCurrent.style.marginBottom = '0';
                                                wrapperCurrent.appendChild(containerCurrent);
                                                
                                                let containerMoved = false;
                                                let containerNext = null;
                                                
                                                const containerChildren = Array.from(subItem.children);
                                                containerChildren.forEach(cc => {
                                                    if (!containerMoved) {
                                                        containerCurrent.appendChild(cc);
                                                        if (currentPage.scrollHeight > PAGE_HEIGHT) {
                                                            containerCurrent.removeChild(cc);
                                                            containerMoved = true;
                                                            movedToNextPage = true;
                                                            finalizePage(currentPage);
                                                            currentPage = createNewPageWithWrapper();
                                                            wrapperNext = child.cloneNode(false); currentWrapper.appendChild(wrapperNext);
                                                            containerNext = subItem.cloneNode(false); wrapperNext.appendChild(containerNext);
                                                            containerNext.appendChild(cc);
                                                        }
                                                    } else {
                                                        containerNext.appendChild(cc);
                                                        if (currentPage.scrollHeight > PAGE_HEIGHT) {
                                                            containerNext.removeChild(cc);
                                                            finalizePage(currentPage);
                                                            currentPage = createNewPageWithWrapper();
                                                            wrapperNext = child.cloneNode(false); currentWrapper.appendChild(wrapperNext);
                                                            containerNext = subItem.cloneNode(false); wrapperNext.appendChild(containerNext);
                                                            containerNext.appendChild(cc);
                                                        }
                                                    }
                                                });
                                                if (containerCurrent.children.length === 0) wrapperCurrent.removeChild(containerCurrent);
                                                
                                            } else {
                                                // No split possible, move entire subItem to next page
                                                movedToNextPage = true;
                                                finalizePage(currentPage);
                                                currentPage = createNewPageWithWrapper();
                                                wrapperNext = child.cloneNode(false); currentWrapper.appendChild(wrapperNext);
                                                wrapperNext.appendChild(subItem);
                                            }
                                        }
                                    } else {
                                        // Already on next page
                                        wrapperNext.appendChild(subItem);
                                        if (currentPage.scrollHeight > PAGE_HEIGHT) {
                                            wrapperNext.removeChild(subItem);
                                            finalizePage(currentPage);
                                            currentPage = createNewPageWithWrapper();
                                            wrapperNext = child.cloneNode(false); currentWrapper.appendChild(wrapperNext);
                                            wrapperNext.appendChild(subItem);
                                        }
                                    }
                                });
                                
                                if (wrapperCurrent.children.length === 0) {
                                    currentWrapper.removeChild(wrapperCurrent);
                                }
                                
                            } else {
                                // Cannot split (no children or no-break). Move entire child to next page.
                                finalizePage(currentPage);
                                currentPage = createNewPageWithWrapper();
                                currentWrapper.appendChild(child);
                            }
                        }
                    });
                    
                    // SAFETY NET: Force ALL pages to proper A4 size
                    const allPages = root.querySelectorAll('[class*="template"], .resume-page');
                    if (allPages.length > 0) {
                        allPages.forEach(page => finalizePage(page));
                    } else {
                        // Fallback: finalize all direct children of root
                        Array.from(root.children).forEach(page => finalizePage(page));
                    }
                }

                window.onload = () => {
                   // Run after layout
                   setTimeout(runPagination, 200);
                };
                
                // Optional: Re-run on major formatting changes if needed, 
                // but usually the user edits text inline which doesn't trigger re-render of iframe in this way.
                // React re-renders invalidates the iframe anyway.
            </script>
        `;

        html = html.replace('</body>', `${interactiveStyles}${interactiveScript}${paginationScript}</body>`);

        return html;
    }, [data, templateId, designSettings]);

    // Handle messages from iframe
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const { type, sectionId, position, formatting, content, styles } = event.data;

            switch (type) {
                case 'SECTION_SELECTED':
                    setSelectedSection({
                        id: sectionId,
                        element: null as any, // We don't have direct access to iframe elements
                        type: sectionId as any
                    });
                    break;

                case 'SECTION_DESELECTED':
                    setSelectedSection(null);
                    break;

                case 'CONTENT_CHANGED':
                    // Update the data with new content
                    handleContentChange(sectionId, content, styles);
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [data]);

    const handleContentChange = (sectionId: string, content: string, styles?: any) => {
        const newData = { ...data };
        const cleanContent = content.replace(/<[^>]*>/g, ''); // Strip HTML

        // Map section IDs to data fields
        if (sectionId === 'fullName') {
            newData.fullName = cleanContent;
        } else if (sectionId === 'jobTitle') {
            newData.jobTitle = cleanContent;
        } else if (sectionId === 'email') {
            newData.contact.email = cleanContent;
        } else if (sectionId === 'phone') {
            newData.contact.phone = cleanContent;
        } else if (sectionId === 'location') {
            newData.contact.location = cleanContent;
        } else if (sectionId === 'linkedin') {
            newData.contact.linkedin = cleanContent;
        } else if (sectionId === 'website') {
            newData.contact.website = cleanContent;
        } else if (sectionId === 'summary') {
            newData.summary = cleanContent;
        } else if (sectionId.startsWith('experience-')) {
            // Handle experience-{index}-{field}
            const parts = sectionId.split('-');
            const index = parseInt(parts[1]);
            const field = parts[2];

            if (newData.experience && newData.experience[index]) {
                if (field === 'company') {
                    newData.experience[index].company = cleanContent;
                } else if (field === 'role') {
                    newData.experience[index].role = cleanContent;
                } else if (field === 'description') {
                    newData.experience[index].description = cleanContent;
                }
            }
        } else if (sectionId.startsWith('education-')) {
            // Handle education-{index}-{field}
            const parts = sectionId.split('-');
            const index = parseInt(parts[1]);
            const field = parts[2];

            if (newData.education && newData.education[index]) {
                if (field === 'school') {
                    newData.education[index].school = cleanContent;
                } else if (field === 'degree') {
                    newData.education[index].degree = cleanContent;
                }
            }
        }

        onDataChange(newData);
    };

    // Create blob URL for iframe - only regenerate when data/template/settings change
    const htmlContent = generateHtml();
    const [blobUrl, setBlobUrl] = useState('');
    const [iframeLoaded, setIframeLoaded] = useState(false);

    // Track initial URL to use as src attribute (ensures proper initialization)
    const [initialUrl, setInitialUrl] = useState<string | null>(null);

    useEffect(() => {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);

        // Set initial URL once
        if (!initialUrl) {
            setInitialUrl(url);
        }

        // Manually update iframe location to prevent history stack buildup
        if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.location.replace(url);
        }

        setIframeLoaded(true);

        return () => URL.revokeObjectURL(url);
    }, [htmlContent]);

    return (
        <div className="w-full h-full relative bg-gray-100">


            {/* Preview iframe - src prop ensures initial load, location.replace handles updates */}
            {blobUrl ? (
                <iframe
                    ref={iframeRef}
                    src={initialUrl || ""}
                    className="w-full h-full border-none bg-white"
                    title="Interactive Resume Preview"
                    style={{
                        transform: 'scale(0.85)',
                        transformOrigin: 'top center',
                        width: '117.6%',
                        height: '117.6%',
                        marginLeft: '-8.8%',
                    }}
                />
            ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                    Loading preview...
                </div>
            )}

            {/* Helper Text */}
            {!selectedSection && blobUrl && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg text-xs pointer-events-none z-10">
                    Click any section to select • Double-click to edit • Esc to deselect
                </div>
            )}
        </div>
    );
};
