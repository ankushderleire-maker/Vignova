"use client";

import React from "react";
import {
  PDFViewer,
  PDFDownloadLink
} from "@react-pdf/renderer";
import DynamicResumeRenderer from "@/components/resume-engine/Renderer";
import { ResumeData } from "@/types/resume";
import { TemplateConfig } from "@/components/resume-engine/templates";
import { Download } from "lucide-react";
import { DesignSettings } from "@/components/resume-engine/DesignControls";

// --- COMPONENT 1: THE PREVIEW PANEL ---
export const PdfPreviewPanel = ({
  data,
  config,
  designSettings
}: {
  data: ResumeData;
  config: TemplateConfig;
  designSettings?: DesignSettings;
}) => {
  return (
    <div className="w-full h-full">
      <PDFViewer className="w-full h-full border-none" showToolbar={false}>
        <DynamicResumeRenderer data={data} config={config} designSettings={designSettings} />
      </PDFViewer>
    </div>
  );
};

// --- COMPONENT 2: THE DOWNLOAD BUTTON ---
export const PdfDownloadButton = ({
  data,
  config,
  designSettings,
  fileName
}: {
  data: ResumeData;
  config: TemplateConfig;
  designSettings?: DesignSettings;
  fileName: string;
}) => {
  return (
    <PDFDownloadLink
      document={<DynamicResumeRenderer data={data} config={config} designSettings={designSettings} />}
      fileName={fileName}
      className="flex items-center gap-1 bg-white text-black hover:bg-gray-200 transition px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap"
    >
      {/* @ts-ignore - React PDF types sometimes complain about 'loading' */}
      {({ loading }: { loading: boolean }) =>
        loading ? "Preparing..." : <><Download className="h-3 w-3" /> Download PDF</>
      }
    </PDFDownloadLink>
  );
};