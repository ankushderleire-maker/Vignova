'use client';

import React from 'react';
import { useResumeStore, TEMPLATES, TemplateId } from '@/lib/stores/resumeStore';
import { Crown, Check } from 'lucide-react';

interface TemplateSidebarProps {
  onTemplateSelect?: (templateId: TemplateId) => void;
}

/**
 * Template Sidebar
 * Grid of template thumbnails with hover interactions
 * Styled to match the dashboard theme
 */
export const TemplateSidebar: React.FC<TemplateSidebarProps> = ({ onTemplateSelect }) => {
  const { selectedTemplate, hoveredTemplate, setSelectedTemplate, setHoveredTemplate } = useResumeStore();

  const handleMouseEnter = (templateId: TemplateId) => {
    setHoveredTemplate(templateId);
  };

  const handleMouseLeave = () => {
    setHoveredTemplate(null);
  };

  const handleClick = (templateId: TemplateId) => {
    setSelectedTemplate(templateId);
    onTemplateSelect?.(templateId);
  };

  // Color per template for the thumbnail background
  const thumbnailColors: Record<string, string> = {
    modern: 'linear-gradient(135deg, #667eea, #764ba2)',
    classic: 'linear-gradient(135deg, #2c3e50, #34495e)',
    creative: 'linear-gradient(135deg, #f093fb, #f5576c)',
    professional: 'linear-gradient(135deg, #4facfe, #00f2fe)',
    minimal: 'linear-gradient(135deg, #a8edea, #fed6e3)',
  };

  return (
    <div className="ts-root">
      <div className="ts-header">
        <h2 className="ts-heading">Templates</h2>
        <p className="ts-sub">Hover to preview · Click to select</p>
      </div>

      <div className="ts-grid">
        {TEMPLATES.map((template) => {
          const isSelected = selectedTemplate === template.id;
          const isHovered = hoveredTemplate === template.id;

          return (
            <div
              key={template.id}
              className={`ts-card ${isSelected ? 'ts-card--selected' : ''} ${isHovered ? 'ts-card--hovered' : ''}`}
              onMouseEnter={() => handleMouseEnter(template.id)}
              onMouseLeave={handleMouseLeave}
              onClick={() => handleClick(template.id)}
            >
              <div
                className="ts-thumb"
                style={{ background: thumbnailColors[template.id] || 'linear-gradient(135deg, #9ca3af, #4b5563)' }}
              >
                <span className="ts-thumb-letter">{template.name.charAt(0)}</span>

                {isSelected && (
                  <div className="ts-check">
                    <Check size={14} />
                  </div>
                )}

                {template.isPremium && (
                  <div className="ts-crown">
                    <Crown size={10} />
                    <span>PRO</span>
                  </div>
                )}
              </div>

              <div className="ts-info">
                <span className="ts-name">{template.name}</span>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .ts-root {
          height: 100%;
          overflow-y: auto;
          padding: 20px;
          background: var(--background, #1a1a2e);
        }

        .ts-header {
          margin-bottom: 16px;
        }

        .ts-heading {
          font-size: 16px;
          font-weight: 700;
          color: var(--foreground, #e5e7eb);
          margin-bottom: 4px;
        }

        .ts-sub {
          font-size: 11px;
          color: var(--secondary-text, #9ca3af);
        }

        .ts-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .ts-card {
          cursor: pointer;
          border-radius: 8px;
          overflow: hidden;
          background: var(--card-bg, rgba(255,255,255,0.05));
          border: 2px solid transparent;
          transition: all 0.2s ease;
        }
        .ts-card:hover {
          border-color: var(--primary, #667eea);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102,126,234,0.2);
        }
        .ts-card--selected {
          border-color: var(--primary, #667eea);
          box-shadow: 0 0 0 2px rgba(102,126,234,0.2);
        }

        .ts-thumb {
          position: relative;
          aspect-ratio: 210/297;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ts-thumb-letter {
          font-size: 36px;
          font-weight: 800;
          color: rgba(255,255,255,0.8);
          text-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }

        .ts-check {
          position: absolute;
          top: 6px;
          right: 6px;
          background: #10b981;
          color: white;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ts-crown {
          position: absolute;
          top: 6px;
          left: 6px;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: white;
          border-radius: 3px;
          padding: 2px 6px;
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 9px;
          font-weight: 700;
        }

        .ts-info {
          padding: 8px 10px;
        }

        .ts-name {
          font-size: 12px;
          font-weight: 600;
          color: var(--foreground, #e5e7eb);
        }
      `}</style>
    </div>
  );
};
