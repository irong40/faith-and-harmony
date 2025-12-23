import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Camera, Video } from "lucide-react";
import { useState } from "react";

const glossaryItems = [
  {
    term: "Oblique Exterior Photo",
    icon: Camera,
    definition: "Angled photo showing depth, curb appeal, and building lines."
  },
  {
    term: "Nadir Photo",
    icon: Camera,
    definition: "Straight-down 'map style' photo showing lot layout."
  },
  {
    term: "Reveal Clip",
    icon: Video,
    definition: "Starts tight, then backs up and rises to reveal the full property."
  },
  {
    term: "Orbit Clip",
    icon: Video,
    definition: "Smooth arc around the property to show all sides."
  },
  {
    term: "Pull-away Clip",
    icon: Video,
    definition: "Starts near a feature (pool, patio), then moves away to show space."
  },
  {
    term: "Context Clip/Photo",
    icon: Camera,
    definition: "Shows proximity to water, parks, major roads, or neighborhood."
  }
];

export function ShotGlossary() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="bg-card rounded-2xl border border-border shadow-lg">
      <CollapsibleTrigger className="w-full px-8 py-5 flex items-center justify-between hover:bg-muted/10 transition-colors rounded-2xl">
        <div className="flex items-center gap-3">
          <Camera className="w-5 h-5 text-accent" />
          <span className="font-semibold text-lg text-primary">Shot Glossary</span>
          <span className="text-sm text-muted-foreground">— What do these terms mean?</span>
        </div>
        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-8 pb-6 pt-2 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {glossaryItems.map((item) => (
            <div key={item.term} className="flex gap-3 p-4 bg-background rounded-xl border border-border/50">
              <item.icon className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-primary text-sm">{item.term}</p>
                <p className="text-muted-foreground text-sm">{item.definition}</p>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
