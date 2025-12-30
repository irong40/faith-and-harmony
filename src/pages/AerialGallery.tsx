import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ImageCompareSlider from "@/components/ImageCompareSlider";
import { Paintbrush, Droplets, Shapes, Filter } from "lucide-react";

type StyleFilter = "all" | "oil" | "watercolor" | "abstract";

interface GalleryItem {
  id: string;
  before: string;
  after: string;
  title: string;
  location: string;
  style: StyleFilter;
}

const galleryItems: GalleryItem[] = [
  {
    id: "dock-sunset",
    before: "/assets/aerial/dock-before.jpg",
    after: "/assets/aerial/dock-after.png",
    title: "Lakeside Dock at Sunset",
    location: "Private Estate, Georgia",
    style: "oil",
  },
  {
    id: "forest-canopy",
    before: "/assets/aerial/trees-before.jpg",
    after: "/assets/aerial/trees-after.png",
    title: "Autumn Forest Canopy",
    location: "North Georgia Mountains",
    style: "oil",
  },
  {
    id: "autumn-creek",
    before: "/assets/aerial/creek-before.jpg",
    after: "/assets/aerial/creek-after.png",
    title: "Carrollon Creek",
    location: "Carrollton, Georgia",
    style: "oil",
  },
];

const styleFilters: { value: StyleFilter; label: string; icon: typeof Paintbrush }[] = [
  { value: "all", label: "All Styles", icon: Filter },
  { value: "oil", label: "Oil Painting", icon: Paintbrush },
  { value: "watercolor", label: "Watercolor", icon: Droplets },
  { value: "abstract", label: "Abstract", icon: Shapes },
];

const AerialGallery = () => {
  const [activeFilter, setActiveFilter] = useState<StyleFilter>("all");
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);

  const filteredItems =
    activeFilter === "all"
      ? galleryItems
      : galleryItems.filter((item) => item.style === activeFilter);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        {/* Hero Section */}
        <section className="py-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-primary font-display">
            Aerial Art Gallery
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Explore our portfolio of aerial photography transformed into stunning digital art. 
            Drag the slider on each image to see the before and after.
          </p>

          {/* Filter Buttons */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {styleFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setActiveFilter(filter.value)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all duration-300 ${
                  activeFilter === filter.value
                    ? "bg-accent text-primary shadow-lg"
                    : "bg-card border border-border text-muted-foreground hover:border-accent hover:text-accent"
                }`}
              >
                <filter.icon className="w-4 h-4" />
                {filter.label}
              </button>
            ))}
          </div>
        </section>

        {/* Gallery Grid */}
        <section className="pb-16">
          {filteredItems.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">
                No artworks in this style yet. Check back soon!
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="group cursor-pointer"
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="rounded-2xl overflow-hidden shadow-lg border border-border hover:shadow-2xl transition-shadow duration-300">
                    <ImageCompareSlider
                      beforeImage={item.before}
                      afterImage={item.after}
                      beforeLabel="Original"
                      afterLabel="Transformed"
                    />
                  </div>
                  <div className="mt-4 text-center">
                    <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{item.location}</p>
                    <span className="inline-block mt-2 px-3 py-1 bg-accent/20 text-accent text-xs font-semibold rounded-full capitalize">
                      {item.style} Style
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* CTA Section */}
        <section className="pb-20 text-center">
          <div className="bg-primary rounded-3xl p-10 shadow-2xl">
            <h2 className="text-3xl font-bold mb-4 font-display text-primary-foreground">
              Ready to Transform Your Property?
            </h2>
            <p className="text-secondary opacity-90 mb-8 max-w-xl mx-auto">
              Commission your own custom aerial artwork. We'll capture your property from the sky 
              and transform it into a timeless piece of art.
            </p>
            <Link
              to="/request-service?service=AERIAL"
              className="inline-block px-10 py-4 bg-gradient-to-r from-accent to-amber-400 text-primary font-semibold text-lg rounded-full hover:opacity-90 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Commission Your Aerial Art
            </Link>
          </div>
        </section>
      </div>

      {/* Lightbox Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="max-w-5xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-border">
              <ImageCompareSlider
                beforeImage={selectedItem.before}
                afterImage={selectedItem.after}
                beforeLabel="Original Drone Capture"
                afterLabel="AI Transformation"
              />
            </div>
            <div className="mt-6 text-center">
              <h2 className="text-2xl font-bold text-foreground">{selectedItem.title}</h2>
              <p className="text-muted-foreground">{selectedItem.location}</p>
              <button
                onClick={() => setSelectedItem(null)}
                className="mt-4 px-6 py-2 border border-border rounded-full text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default AerialGallery;
