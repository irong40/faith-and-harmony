import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight } from "lucide-react";
import type { ReportSectionKey, SectionDataMap, SectionManifestEntry } from "@/types/report";

interface SectionNavProps {
  manifest: SectionManifestEntry[];
  activeSections: ReportSectionKey[];
  selectedSection: ReportSectionKey | null;
  sectionData: Partial<SectionDataMap>;
  onToggle: (key: ReportSectionKey) => void;
  onSelect: (key: ReportSectionKey) => void;
}

export function ReportSectionNav({
  manifest,
  activeSections,
  selectedSection,
  sectionData,
  onToggle,
  onSelect,
}: SectionNavProps) {
  return (
    // `flex-1 min-h-0`, not a hardcoded `calc(100vh - 12rem)`. The magic
    // number was wrong the moment the admin nav grew a second row, and it
    // measured the VIEWPORT rather than the pane this nav actually lives in.
    // The pane now has a real height, so ask it for the leftover instead.
    <ScrollArea className="min-h-0 flex-1">
      <div className="space-y-1 pr-2">
        {manifest.map((entry) => {
          const active = activeSections.includes(entry.key);
          const hasData =
            !!sectionData[entry.key] &&
            Object.keys(sectionData[entry.key] as Record<string, unknown>).length > 0;
          const selected = selectedSection === entry.key;
          return (
            <div
              key={entry.key}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors ${
                selected ? "bg-accent text-accent-foreground" : "hover:bg-muted"
              } ${!active ? "opacity-50" : ""}`}
              onClick={() => active && onSelect(entry.key)}
            >
              <Checkbox
                checked={active}
                disabled={entry.required}
                onCheckedChange={() => onToggle(entry.key)}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Toggle ${entry.label}`}
              />
              <span className="flex-1 truncate">{entry.label}</span>
              {active && hasData && (
                <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
              )}
              {selected && <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
