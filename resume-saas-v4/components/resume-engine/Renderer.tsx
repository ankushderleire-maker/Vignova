import { Document, Page, View } from "@react-pdf/renderer";
import { WIDGET_REGISTRY } from "./ResumeWidgets";
import { ResumeData } from "@/types/resume";
import { TEMPLATE_MAP, TemplateConfig } from "./templates";
import { DesignSettings } from "./DesignControls";

const DynamicResumeRenderer = ({
  data,
  config,
  designSettings
}: {
  data: ResumeData,
  config: TemplateConfig,
  designSettings?: DesignSettings
}) => {

  const SelectedTemplate = TEMPLATE_MAP[config.id];

  if (SelectedTemplate) {
    return (
      <Document>
        <Page size="A4" style={{ padding: 0 }}>
          {/* @ts-ignore - Template might not expect designSettings yet */}
          <SelectedTemplate data={data} headerColor={config.styles?.headerColor} designSettings={designSettings} />
        </Page>
      </Document>
    );
  }

  // FALLBACK: OLD WIDGET SYSTEM (Keep for safety or mixed usage)
  const renderSections = (sectionKeys: string[]) => {
    return sectionKeys.map((key, index) => {
      const WidgetComponent = WIDGET_REGISTRY[key];
      if (!WidgetComponent && key === 'contact') return null;
      if (!WidgetComponent) return null;

      return <WidgetComponent key={index} data={data} />;
    });
  };

  return (
    <Document>
      <Page size="A4" style={{
        flexDirection: config.type === "two-column" ? 'row' : 'column',
        backgroundColor: '#FFF',
        ...config.styles
      }}>

        {/* SINGLE COLUMN */}
        {config.type === "single-column" && config.sections && (
          <View style={{ flex: 1 }}>
            {renderSections(config.sections)}
          </View>
        )}

        {/* TWO COLUMN */}
        {config.type === "two-column" && config.columns && (
          <>
            <View style={{
              width: config.layout?.leftColWidth,
              backgroundColor: config.layout?.leftBg,
              padding: 20,
              height: '100%'
            }}>
              {renderSections(config.columns.left)}
            </View>

            <View style={{
              width: config.layout?.rightColWidth,
              padding: 20
            }}>
              {renderSections(config.columns.right)}
            </View>
          </>
        )}
      </Page>
    </Document>
  );
};


export default DynamicResumeRenderer;