'use client';

import React, { useState, Suspense } from 'react';
import { useResumeStore } from '@/lib/stores/resumeStore';
import { ResumePreview } from '@/components/template-selector/ResumePreview';
import { A4Scaler } from '@/components/template-selector/A4Scaler';
import { TemplateSidebar } from '@/components/template-selector/TemplateSidebar';
import { ArrowLeft, Check, Menu, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Template Selection Page
 * Works within the dashboard layout (sidebar + header already present)
 * Fills the content area with a collapsible template drawer + live preview
 */
function TemplateSelectionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resumeData, getActiveTemplate, selectedTemplate } = useResumeStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const activeTemplateId = getActiveTemplate();

  const handleSaveAndContinue = () => {
    // Navigate back to where we came from (AI Studio editing screen)
    const returnUrl = searchParams.get('returnUrl');
    if (returnUrl) {
      router.push(returnUrl);
    } else {
      router.back();
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  return (
    <div className="animate-slide-down h-full flex flex-col">
      {/* Custom header bar for this page */}
      <div className="tpl-header">
        <button onClick={() => router.back()} className="tpl-back-btn">
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>

        <h1 className="tpl-title">Choose Your Resume Template</h1>

        <button onClick={handleSaveAndContinue} className="tpl-save-btn">
          <Check size={18} />
          <span>Save & Continue</span>
        </button>
      </div>

      {/* Main content area */}
      <div className="tpl-main">
        {/* Overlay when sidebar is open */}
        {isSidebarOpen && (
          <div className="tpl-overlay" onClick={() => setIsSidebarOpen(false)} />
        )}
      </div>


      {/* Collapsible Sidebar Drawer */}
      <div className={`tpl-drawer ${isSidebarOpen ? 'tpl-drawer--open' : ''}`}>
        <TemplateSidebar />
      </div>

      {/* Preview Area */}
      <div className="tpl-preview-area">
        {/* Hamburger Toggle */}
        <button
          onClick={toggleSidebar}
          className="tpl-hamburger"
          title={isSidebarOpen ? 'Close templates' : 'Browse templates'}
        >
          {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Status badge */}
        <div className="tpl-status-badge">
          {selectedTemplate === activeTemplateId ? 'Selected' : 'Preview'}
        </div>

        {/* A4 Preview */}
        <A4Scaler>
          <ResumePreview
            templateId={activeTemplateId}
            resumeData={resumeData}
          />
        </A4Scaler>
      </div>


      <style jsx>{`
        /* ---- Header ---- */
        .tpl-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 0;
          margin: -32px -32px 0 -32px;
          padding: 16px 24px;
          background: var(--background, #111);
          border-bottom: 1px solid var(--border-color, #333);
        }

        .tpl-back-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border: 1px solid var(--border-color, #444);
          border-radius: 6px;
          background: transparent;
          color: var(--foreground, #e5e7eb);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .tpl-back-btn:hover {
          background: rgba(255,255,255,0.05);
          border-color: var(--primary, #667eea);
        }

        .tpl-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--foreground, #e5e7eb);
        }

        .tpl-save-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: box-shadow 0.2s, transform 0.15s;
          box-shadow: 0 2px 8px rgba(102,126,234,0.3);
        }
        .tpl-save-btn:hover {
          box-shadow: 0 4px 14px rgba(102,126,234,0.45);
          transform: translateY(-1px);
        }

        /* ---- Main Area ---- */
        .tpl-main {
          position: relative;
          margin: 0 -32px -32px -32px;
          height: calc(100vh - 64px - 56px - 32px);
          overflow: hidden;
        }

        /* Overlay */
        .tpl-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.45);
          z-index: 25;
          cursor: pointer;
        }

        /* ---- Drawer ---- */
        .tpl-drawer {
          position: absolute;
          top: 0;
          left: 0;
          width: 360px;
          height: 100%;
          z-index: 30;
          transform: translateX(-100%);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: var(--background, #1a1a2e);
          border-right: 1px solid var(--border-color, #333);
          overflow: hidden;
        }
        .tpl-drawer--open {
          transform: translateX(0);
        }

        /* ---- Preview ---- */
        .tpl-preview-area {
          width: 100%;
          height: 100%;
          background: #3a3d42;
          position: relative;
        }

        .tpl-hamburger {
          position: absolute;
          top: 16px;
          left: 16px;
          z-index: 20;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.6);
          color: white;
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 8px;
          cursor: pointer;
          backdrop-filter: blur(6px);
          transition: background 0.15s, transform 0.15s;
        }
        .tpl-hamburger:hover {
          background: rgba(0,0,0,0.8);
          transform: scale(1.06);
        }
        .tpl-hamburger:active {
          transform: scale(0.95);
        }

        .tpl-status-badge {
          position: absolute;
          top: 16px;
          right: 16px;
          z-index: 10;
          background: rgba(0,0,0,0.6);
          color: white;
          padding: 5px 12px;
          border-radius: 5px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.5px;
          backdrop-filter: blur(6px);
          border: 1px solid rgba(255,255,255,0.1);
        }

        @media (max-width: 768px) {
          .tpl-drawer { width: 100%; }
          .tpl-title { display: none; }
          .tpl-header { padding: 12px 16px; }
        }
      `}</style>
    </div >
  );
}

export default function TemplateSelectionPage() {
  return (
    <Suspense fallback={<div className="h-full flex items-center justify-center p-8 text-[var(--foreground)]">Loading Templates...</div>}>
      <TemplateSelectionPageContent />
    </Suspense>
  );
}
