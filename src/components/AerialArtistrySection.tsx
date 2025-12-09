import { Link } from "react-router-dom";
import { Plane, Sparkles, Package, ShieldCheck } from "lucide-react";
import ImageCompareSlider from "./ImageCompareSlider";

// Import images
import dockBefore from "@/assets/aerial/dock-before.jpg";
import dockAfter from "@/assets/aerial/dock-after.png";
import treesBefore from "@/assets/aerial/trees-before.jpg";
import treesAfter from "@/assets/aerial/trees-after.png";
import creekBefore from "@/assets/aerial/creek-before.jpg";
import creekAfter from "@/assets/aerial/creek-after.png";

const features = [
  {
    icon: Plane,
    title: "Commercial Flight",
    description: "High-resolution capture by licensed pilots.",
  },
  {
    icon: Sparkles,
    title: "AI Transformation",
    description: "Custom style transfer (Oil, Watercolor, Abstract).",
  },
  {
    icon: Package,
    title: "Dual Delivery",
    description: "Receive both the realistic HDR photo and the artistic digital print.",
  },
];

const galleryItems = [
  { before: treesBefore, after: treesAfter, label: "Forest Canopy" },
  { before: creekBefore, after: creekAfter, label: "Autumn Creek" },
];

const AerialArtistrySection = () => {
  return (
    <section className="mb-16">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <h2 className="text-4xl font-bold text-primary font-display">
          Aerial Imaging & AI Artistry
        </h2>
        <div className="flex items-center gap-2 bg-accent/20 border border-accent rounded-full px-4 py-2">
          <ShieldCheck className="w-5 h-5 text-accent" />
          <span className="text-accent font-semibold text-sm">FAA Part 107 Certified</span>
        </div>
      </div>

      {/* Hero Before/After Slider */}
      <div className="mb-10">
        <ImageCompareSlider
          beforeImage={dockBefore}
          afterImage={dockAfter}
          beforeLabel="Drone Capture"
          afterLabel="AI Artistry"
        />
      </div>

      {/* Content Block */}
      <div className="bg-card rounded-3xl p-8 md:p-10 shadow-xl border border-border">
        <h3 className="text-3xl md:text-4xl font-bold text-primary mb-4 font-display">
          Sky to Canvas: Custom Aerial Artistry
        </h3>
        <p className="text-lg text-muted-foreground mb-8 max-w-3xl">
          We merge commercial drone precision with generative AI to transform your property 
          into a timeless digital masterpiece.
        </p>

        {/* Feature List */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-4 rounded-xl bg-background/50 border border-border"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                <feature.icon className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h4 className="font-bold text-foreground mb-1">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            to="/request-service?service=AERIAL"
            className="px-8 py-4 bg-gradient-to-r from-accent to-amber-400 text-primary font-semibold text-lg rounded-full hover:opacity-90 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl text-center"
          >
            Commission Your Aerial Art
          </Link>
          <Link
            to="#aerial-gallery"
            className="px-8 py-4 border-2 border-primary text-primary font-semibold text-lg rounded-full hover:bg-primary hover:text-primary-foreground transition-all duration-300 text-center"
          >
            View Gallery
          </Link>
        </div>
      </div>

      {/* Mini Gallery */}
      <div id="aerial-gallery" className="mt-12">
        <h3 className="text-2xl font-bold text-primary mb-6 font-display text-center">
          More Transformations
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          {galleryItems.map((item, index) => (
            <div key={index} className="group">
              <div className="rounded-2xl overflow-hidden shadow-lg border border-border">
                <ImageCompareSlider
                  beforeImage={item.before}
                  afterImage={item.after}
                  beforeLabel="Original"
                  afterLabel="Transformed"
                />
              </div>
              <p className="text-center mt-3 text-muted-foreground font-medium">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AerialArtistrySection;
