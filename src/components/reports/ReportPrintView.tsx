import { forwardRef } from "react";
import { SAI_BRAND, REPORT_COLORS } from "@/lib/brand";
import { ReportSection, isSectionDataEmpty } from "./ReportSection";
import type { JobReport, ReportTemplate, ReportImage, SectionManifestEntry, ReportSectionKey, SectionDataMap } from "@/types/report";

interface ReportPrintViewProps {
  report: JobReport;
  template: ReportTemplate;
  images: ReportImage[];
}

/**
 * Print-optimized report view. Rendered in a hidden div, triggered via window.print().
 * Matches ReportPreview styling but with @media print overrides for clean PDF output.
 */
const ReportPrintView = forwardRef<HTMLDivElement, ReportPrintViewProps>(
  ({ report, template, images }, ref) => {
    const activeSections = template.sections_manifest.filter(
      (s: SectionManifestEntry) => report.active_sections.includes(s.key)
    );

    const getSectionImages = (key: ReportSectionKey) =>
      images.filter((img) => img.section_key === key).sort((a, b) => a.sort_order - b.sort_order);

    return (
      <div ref={ref} className="report-print-view" style={{ background: REPORT_COLORS.bg, color: REPORT_COLORS.text }}>
        <style>{`
          @media print {
            body * { visibility: hidden; }
            .report-print-view, .report-print-view * { visibility: visible; }
            .report-print-view {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: #ffffff;
              color: #333333;
            }
            .no-print { display: none !important; }
            .report-section { page-break-inside: avoid; }
            .report-page-break { page-break-before: always; }
            @page {
              size: letter;
              margin: 0.75in 1in;
            }
          }
        `}</style>

        {/* Letterhead Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: "12px",
            borderBottom: `3px solid ${REPORT_COLORS.borderAccent}`,
            marginBottom: "24px",
          }}
        >
          <div>
            <div style={{ fontSize: "18pt", fontWeight: 700, color: REPORT_COLORS.heading, fontFamily: "Georgia, serif" }}>
              {SAI_BRAND.name}
            </div>
            <div style={{ fontSize: "9pt", color: REPORT_COLORS.textSecondary, fontStyle: "italic" }}>
              {SAI_BRAND.tagline} — Veteran-Owned
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: "8.5pt", color: REPORT_COLORS.textSecondary, lineHeight: 1.6 }}>
            {SAI_BRAND.location}<br />
            {SAI_BRAND.phone}<br />
            {SAI_BRAND.email}<br />
          </div>
        </div>

        {/* Document Meta */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", fontSize: "9.5pt", color: REPORT_COLORS.textSecondary }}>
          <div>
            <strong>Document:</strong> Deliverable Report<br />
            <strong>Date:</strong> {report.report_date}<br />
            <strong>Prepared by:</strong> {report.prepared_by}
          </div>
          <div style={{ textAlign: "right" }}>
            <strong>Classification:</strong>{" "}
            <span style={{ color: REPORT_COLORS.primaryDark, fontWeight: 600, textTransform: "uppercase", fontSize: "8pt", letterSpacing: "0.5px" }}>
              {report.classification}
            </span>
          </div>
        </div>

        {/* Report Title */}
        <div style={{ fontSize: "14pt", fontWeight: 700, color: REPORT_COLORS.heading, marginBottom: "24px", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "Georgia, serif" }}>
          {report.title}
        </div>

        {/* Sections */}
        {activeSections.map((manifest: SectionManifestEntry, index: number) => {
          const sectionData = report.section_data[manifest.key];
          // Same predicate as the builder's pre-print warning: a section the
          // warning calls EMPTY must actually be omitted here, not printed as
          // a title plus dashed empty-state placeholders.
          if (isSectionDataEmpty(sectionData)) return null;

          return (
            <div key={manifest.key} className="report-section" style={{ marginBottom: "24px" }}>
              {index > 0 && (
                <div style={{ borderTop: `1px solid ${REPORT_COLORS.border}`, marginBottom: "16px", opacity: 0.4 }} />
              )}
              <ReportSection
                sectionKey={manifest.key}
                data={sectionData as SectionDataMap[typeof manifest.key]}
                onChange={() => {}}
                mode="preview"
                images={getSectionImages(manifest.key)}
              />
            </div>
          );
        })}

        {/* Footer */}
        <div
          style={{
            borderTop: `2px solid ${REPORT_COLORS.borderAccent}`,
            paddingTop: "10px",
            marginTop: "40px",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "8pt",
            color: REPORT_COLORS.textSecondary,
          }}
        >
          <div>
            Faith &amp; Harmony LLC — faithandharmonyllc.com
            <div style={{ fontSize: "7.5pt", color: REPORT_COLORS.textMuted, marginTop: "4px" }}>
              {SAI_BRAND.name} is a service line of Faith &amp; Harmony LLC.
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            &copy; 2026 Faith &amp; Harmony LLC<br />
            All rights reserved.
          </div>
        </div>
      </div>
    );
  }
);

ReportPrintView.displayName = "ReportPrintView";

export default ReportPrintView;
