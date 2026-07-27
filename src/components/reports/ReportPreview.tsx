import { SAI_BRAND, FH_BRAND, REPORT_COLORS } from "@/lib/brand";
import { ReportSection } from "./ReportSection";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  ReportSectionKey,
  SectionDataMap,
  ReportImage,
  SectionManifestEntry,
} from "@/types/report";

interface ReportPreviewProps {
  activeSections: ReportSectionKey[];
  sectionData: Partial<SectionDataMap>;
  manifest: SectionManifestEntry[];
  images: ReportImage[];
}

const noop = () => {};

export function ReportPreview({
  activeSections,
  sectionData,
  manifest,
  images,
}: ReportPreviewProps) {
  // Render sections in manifest order, filtered to active
  const orderedSections = manifest
    .filter((entry) => activeSections.includes(entry.key))
    .map((entry) => entry.key);

  return (
    // Fills its pane rather than guessing at the viewport — see the same note
    // on ReportSectionNav. `calc(100vh - 8rem)` was taller than the pane it
    // sits in, which put a second scrollbar inside the preview column.
    <ScrollArea className="min-h-0 flex-1">
      <div className="bg-white text-gray-900 shadow-lg rounded-sm mx-auto max-w-[640px] p-8 my-4 text-sm leading-relaxed">
        {/* SAI Letterhead Header */}
        <div className="text-center mb-6">
          <h1
            className="text-xl font-bold tracking-wide"
            style={{ color: REPORT_COLORS.primary }}
          >
            {SAI_BRAND.name}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">{SAI_BRAND.tagline}</p>
          <p className="text-xs text-gray-400 mt-1">
            {SAI_BRAND.phone} &middot; {SAI_BRAND.email} &middot;{" "}
            {SAI_BRAND.website}
          </p>
        </div>

        {/* Orange Accent Divider */}
        <div
          className="h-0.5 w-full mb-6 rounded-full"
          style={{ backgroundColor: REPORT_COLORS.borderAccent }}
        />

        {/* Sections */}
        {orderedSections.length === 0 ? (
          <p className="text-center text-gray-400 py-12">
            No sections enabled yet.
          </p>
        ) : (
          orderedSections.map((key, idx) => {
            const data = sectionData[key];
            const sectionImages = images.filter((img) => img.section_key === key);
            return (
              <div key={key}>
                {idx > 0 && <Separator className="my-4" />}
                <ReportSection
                  sectionKey={key}
                  data={data ?? ({} as SectionDataMap[typeof key])}
                  onChange={noop}
                  mode="preview"
                  images={sectionImages}
                />
              </div>
            );
          })
        )}

        {/* Orange Accent Divider */}
        <div
          className="h-0.5 w-full mt-8 mb-4 rounded-full"
          style={{ backgroundColor: REPORT_COLORS.borderAccent }}
        />

        {/* Footer */}
        <div className="text-center text-xs text-gray-400">
          <p>
            {FH_BRAND.name} &mdash; {FH_BRAND.website}
          </p>
          <p className="mt-0.5">{FH_BRAND.copyright}</p>
        </div>
      </div>
    </ScrollArea>
  );
}
