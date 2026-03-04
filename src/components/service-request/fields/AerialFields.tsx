import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Video, FileImage, Clock, Info, MessageSquareQuote } from "lucide-react";
import type { MetadataValue } from "../ConditionalFields";

interface FieldProps {
  metadata: Record<string, MetadataValue>;
  onMetadataChange: (key: string, value: MetadataValue) => void;
}

interface PackageDef {
  code: string;
  name: string;
  price: number; // 0 = quote-based
  turnaround: string;
  photos: number;
  videos: number;
  raw: boolean;
  description: string;
  features?: string[];
}

const WORK_CATEGORIES = [
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'construction', label: 'Construction' },
  { value: 'inspection', label: 'Property Inspection' },
  { value: 'survey', label: 'Land Survey and Mapping' },
  { value: 'insurance', label: 'Insurance Documentation' },
];

const REAL_ESTATE_PACKAGES: PackageDef[] = [
  {
    code: 'LISTING_LITE_225',
    name: 'Listing Lite',
    price: 225,
    turnaround: 'Next day',
    photos: 10,
    videos: 0,
    raw: false,
    description: '10 edited photos with sky replacement in MLS-ready formats',
  },
  {
    code: 'LISTING_PRO_450',
    name: 'Listing Pro',
    price: 450,
    turnaround: '48 hours',
    photos: 25,
    videos: 1,
    raw: false,
    description: '25 photos + 60s highlight reel + 2D property overlay',
    features: ['Sky replacement', '2D overlay'],
  },
  {
    code: 'LUXURY_750',
    name: 'Luxury Listing',
    price: 750,
    turnaround: '24hr priority',
    photos: 40,
    videos: 1,
    raw: false,
    description: '40+ photos + 2-minute cinematic video + twilight session',
    features: ['Twilight included', 'Premium color grading'],
  },
];

const CONSTRUCTION_PACKAGES: PackageDef[] = [
  {
    code: 'CONSTRUCTION_450',
    name: 'Progress Visit (Single)',
    price: 450,
    turnaround: '48 hours',
    photos: 25,
    videos: 4,
    raw: false,
    description: '25 labeled photos + 4 short video clips with compass bearings',
  },
  {
    code: 'COMMERCIAL_850',
    name: 'Commercial Marketing',
    price: 850,
    turnaround: '48 hours',
    photos: 30,
    videos: 1,
    raw: false,
    description: '30+ photos + 90s highlight video for commercial properties',
    features: ['Property boundary overlay', 'Premium color grading'],
  },
  {
    code: 'RETAINER_1_MONTH',
    name: 'Monthly Retainer (1 visit/month)',
    price: 1200,
    turnaround: '48 hours per visit',
    photos: 25,
    videos: 4,
    raw: false,
    description: 'Same deliverables per visit, committed scheduling',
  },
  {
    code: 'RETAINER_2_MONTH',
    name: 'Monthly Retainer (2 visits/month)',
    price: 2100,
    turnaround: '48 hours per visit',
    photos: 25,
    videos: 4,
    raw: false,
    description: 'Same deliverables per visit, committed scheduling',
  },
  {
    code: 'RETAINER_WEEKLY',
    name: 'Weekly Retainer',
    price: 3000,
    turnaround: '48 hours per visit',
    photos: 25,
    videos: 4,
    raw: false,
    description: '4 visits/month, same deliverables per visit',
  },
];

const INSPECTION_PACKAGES: PackageDef[] = [
  {
    code: 'ROOF_INSPECTION',
    name: 'Roof Inspection',
    price: 0,
    turnaround: 'Varies',
    photos: 0,
    videos: 0,
    raw: false,
    description: 'Systematic roof inspection with grid photography and annotated damage report',
    features: ['GPS-tagged images', 'Annotated report', 'Close-up details'],
  },
  {
    code: 'SOLAR_INSPECTION',
    name: 'Solar Panel Inspection',
    price: 0,
    turnaround: 'Varies',
    photos: 0,
    videos: 0,
    raw: false,
    description: 'Thermal + visual inspection for hotspots, defects, and panel-level mapping',
    features: ['Thermal imaging', 'Hotspot detection', 'Temperature differential analysis'],
  },
];

const SURVEY_PACKAGES: PackageDef[] = [
  {
    code: 'LAND_SURVEY',
    name: 'Land Survey and Mapping',
    price: 0,
    turnaround: 'Varies',
    photos: 0,
    videos: 0,
    raw: false,
    description: 'Photogrammetry mapping with orthomosaic, point cloud, and optional 3D mesh output',
    features: ['GeoTIFF export', 'Point cloud', 'GCP integration'],
  },
];

const INSURANCE_PACKAGES: PackageDef[] = [
  {
    code: 'INSURANCE_DOC',
    name: 'Insurance Documentation',
    price: 0,
    turnaround: 'Varies',
    photos: 0,
    videos: 0,
    raw: true,
    description: 'Evidence-grade documentation with RAW capture, GPS metadata, and thermal imaging',
    features: ['RAW + JPEG capture', 'Evidence chain', 'Timestamped photos', 'Thermal available'],
  },
];

const PACKAGES_BY_CATEGORY: Record<string, PackageDef[]> = {
  real_estate: REAL_ESTATE_PACKAGES,
  construction: CONSTRUCTION_PACKAGES,
  inspection: INSPECTION_PACKAGES,
  survey: SURVEY_PACKAGES,
  insurance: INSURANCE_PACKAGES,
};

const ADD_ONS = [
  { code: 'CHANGE_ORDER', name: 'Change-order support photo set', price: 150, description: 'Extra 10 labeled photos' },
  { code: 'RECAP_VIDEO', name: 'End-of-month recap video', price: 350, description: '60-90 second recap' },
];

const DAMAGE_TYPES = [
  { value: 'storm', label: 'Storm' },
  { value: 'wind', label: 'Wind' },
  { value: 'hail', label: 'Hail' },
  { value: 'fire', label: 'Fire' },
  { value: 'flood', label: 'Flood' },
  { value: 'tree', label: 'Tree Damage' },
];

export function AerialFields({ metadata, onMetadataChange }: FieldProps) {
  const workCategory = (metadata.workCategory || '') as string;
  const selectedPackageCode = (metadata.selectedPackage || '') as string;
  const selectedAddOns: string[] = (metadata.addOns || []) as string[];

  const packages = PACKAGES_BY_CATEGORY[workCategory] || [];
  const selectedPackage = packages.find(p => p.code === selectedPackageCode);
  const isQuoteBased = selectedPackage?.price === 0;

  // Calculate estimated total
  const packagePrice = selectedPackage?.price || 0;
  const addOnsPrice = selectedAddOns.reduce((sum, code) => {
    const addon = ADD_ONS.find(a => a.code === code);
    return sum + (addon?.price || 0);
  }, 0);
  const estimatedTotal = packagePrice + addOnsPrice;

  const handlePackageChange = (code: string) => {
    onMetadataChange('selectedPackage', code);
    const pkg = packages.find(p => p.code === code);
    if (pkg) {
      onMetadataChange('estimatedTotal', pkg.price === 0 ? 0 : pkg.price + addOnsPrice);
      onMetadataChange('isQuoteRequest', pkg.price === 0);
    }
  };

  const handleAddOnToggle = (code: string, checked: boolean) => {
    const newAddOns = checked
      ? [...selectedAddOns, code]
      : selectedAddOns.filter(c => c !== code);
    onMetadataChange('addOns', newAddOns);

    const newAddOnsPrice = newAddOns.reduce((sum, c) => {
      const addon = ADD_ONS.find(a => a.code === c);
      return sum + (addon?.price || 0);
    }, 0);
    onMetadataChange('estimatedTotal', packagePrice + newAddOnsPrice);
  };

  const handleCategoryChange = (value: string) => {
    onMetadataChange('workCategory', value);
    onMetadataChange('selectedPackage', '');
    onMetadataChange('addOns', []);
    onMetadataChange('estimatedTotal', 0);
    onMetadataChange('isQuoteRequest', false);
  };

  return (
    <div className="space-y-6 p-6 bg-card/50 rounded-xl border border-border">
      <h3 className="text-lg font-semibold text-primary font-display">Aerial Photography Details</h3>

      {/* Work Category */}
      <div className="space-y-2">
        <Label>What type of project is this?</Label>
        <Select value={workCategory} onValueChange={handleCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select project type" />
          </SelectTrigger>
          <SelectContent>
            {WORK_CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Package Selection */}
      {workCategory && (
        <div className="space-y-2">
          <Label>Select a package</Label>
          <Select value={selectedPackageCode} onValueChange={handlePackageChange}>
            <SelectTrigger>
              <SelectValue placeholder="Choose your package" />
            </SelectTrigger>
            <SelectContent>
              {packages.map(pkg => (
                <SelectItem key={pkg.code} value={pkg.code}>
                  {pkg.name}{pkg.price > 0 ? ` — $${pkg.price.toLocaleString()}` : ' — Request a Quote'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Selected Package Details */}
      {selectedPackage && (
        <div className="bg-background rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-primary">{selectedPackage.name}</p>
              <p className="text-sm text-muted-foreground">{selectedPackage.description}</p>
            </div>
            {isQuoteBased ? (
              <Badge variant="secondary" className="text-sm font-semibold whitespace-nowrap">
                <MessageSquareQuote className="w-3.5 h-3.5 mr-1" />
                Request a Quote
              </Badge>
            ) : (
              <span className="text-xl font-bold text-primary">${selectedPackage.price.toLocaleString()}</span>
            )}
          </div>

          <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
            {selectedPackage.photos > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <Camera className="w-4 h-4 text-accent" />
                <span>{selectedPackage.photos}+ photos</span>
              </div>
            )}
            {selectedPackage.videos > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <Video className="w-4 h-4 text-accent" />
                <span>{selectedPackage.videos} video{selectedPackage.videos > 1 ? 's' : ''}</span>
              </div>
            )}
            {selectedPackage.raw && (
              <div className="flex items-center gap-1.5 text-sm">
                <FileImage className="w-4 h-4 text-accent" />
                <span>Raw included</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{selectedPackage.turnaround}</span>
            </div>
          </div>

          {/* Feature badges for quote-based packages */}
          {selectedPackage.features && selectedPackage.features.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
              {selectedPackage.features.map(f => (
                <Badge key={f} variant="outline" className="text-xs">{f}</Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add-ons (Construction only) */}
      {workCategory === 'construction' && selectedPackageCode && (
        <div className="space-y-3">
          <Label>Add-ons (optional)</Label>
          <div className="space-y-2">
            {ADD_ONS.map(addon => (
              <div key={addon.code} className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
                <Checkbox
                  id={addon.code}
                  checked={selectedAddOns.includes(addon.code)}
                  onCheckedChange={(checked) => handleAddOnToggle(addon.code, checked as boolean)}
                />
                <label htmlFor={addon.code} className="flex-1 cursor-pointer">
                  <p className="font-medium text-sm">{addon.name}</p>
                  <p className="text-xs text-muted-foreground">{addon.description}</p>
                </label>
                <span className="font-semibold text-accent">+${addon.price}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estimated Total (priced packages only) */}
      {selectedPackage && !isQuoteBased && (
        <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-accent" />
            <span className="font-medium text-primary">Estimated Total</span>
          </div>
          <span className="text-2xl font-bold text-primary">${estimatedTotal.toLocaleString()}</span>
        </div>
      )}

      {/* Category-Specific Fields: Inspection */}
      {workCategory === 'inspection' && selectedPackageCode && (
        <div className="space-y-4 p-4 bg-muted/30 rounded-xl border border-border">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Inspection Details</h4>
          <div className="space-y-2">
            <Label>Property type</Label>
            <Select
              value={(metadata.propertyType || '') as string}
              onValueChange={(v) => onMetadataChange('propertyType', v)}
            >
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="residential">Residential</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {selectedPackageCode === 'ROOF_INSPECTION' && (
            <div className="space-y-2">
              <Label>Number of roof sections</Label>
              <Input
                type="number"
                min="1"
                value={(metadata.roofSections || '') as string}
                onChange={(e) => onMetadataChange('roofSections', e.target.value)}
                placeholder="e.g., 4"
              />
            </div>
          )}
          <div className="flex items-center gap-3">
            <Checkbox
              id="thermal_requested"
              checked={!!metadata.thermalRequested}
              onCheckedChange={(checked) => onMetadataChange('thermalRequested', checked as boolean)}
            />
            <label htmlFor="thermal_requested" className="text-sm cursor-pointer">
              Include thermal imaging (if available)
            </label>
          </div>
        </div>
      )}

      {/* Category-Specific Fields: Survey */}
      {workCategory === 'survey' && selectedPackageCode && (
        <div className="space-y-4 p-4 bg-muted/30 rounded-xl border border-border">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Survey Details</h4>
          <div className="space-y-2">
            <Label>Estimated acreage</Label>
            <Input
              type="number"
              min="0.1"
              step="0.1"
              value={(metadata.acreage || '') as string}
              onChange={(e) => onMetadataChange('acreage', e.target.value)}
              placeholder="e.g., 5.0"
            />
          </div>
          <div className="space-y-2">
            <Label>GCP availability</Label>
            <Select
              value={(metadata.gcpAvailability || '') as string}
              onValueChange={(v) => onMetadataChange('gcpAvailability', v)}
            >
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="client_provided">Client will provide GCPs</SelectItem>
                <SelectItem value="sentinel_provided">Sentinel will deploy GCPs</SelectItem>
                <SelectItem value="none">No GCPs needed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Accuracy requirement</Label>
            <Select
              value={(metadata.accuracyRequirement || '') as string}
              onValueChange={(v) => onMetadataChange('accuracyRequirement', v)}
            >
              <SelectTrigger><SelectValue placeholder="Select accuracy" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard (5-10cm)</SelectItem>
                <SelectItem value="high">High (2-5cm)</SelectItem>
                <SelectItem value="survey_grade">Survey Grade (&lt;2cm)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Category-Specific Fields: Insurance */}
      {workCategory === 'insurance' && selectedPackageCode && (
        <div className="space-y-4 p-4 bg-muted/30 rounded-xl border border-border">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Insurance Details</h4>
          <div className="space-y-2">
            <Label>Claim number (optional)</Label>
            <Input
              value={(metadata.claimNumber || '') as string}
              onChange={(e) => onMetadataChange('claimNumber', e.target.value)}
              placeholder="e.g., CLM-2026-12345"
            />
          </div>
          <div className="space-y-2">
            <Label>Date of loss</Label>
            <Input
              type="date"
              value={(metadata.dateOfLoss || '') as string}
              onChange={(e) => onMetadataChange('dateOfLoss', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Damage type</Label>
            <Select
              value={(metadata.damageType || '') as string}
              onValueChange={(v) => onMetadataChange('damageType', v)}
            >
              <SelectTrigger><SelectValue placeholder="Select damage type" /></SelectTrigger>
              <SelectContent>
                {DAMAGE_TYPES.map(dt => (
                  <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Property Address */}
      <div className="space-y-2">
        <Label>Property or site address</Label>
        <Input
          value={(metadata.propertyAddress || '') as string}
          onChange={(e) => onMetadataChange('propertyAddress', e.target.value)}
          placeholder="Enter the address where the shoot will take place"
        />
      </div>

      {/* Number of locations */}
      <div className="space-y-2">
        <Label>Number of locations to cover in one session</Label>
        <Input
          type="number"
          min="1"
          value={(metadata.locationCount || '1') as string}
          onChange={(e) => onMetadataChange('locationCount', e.target.value)}
          placeholder="1"
        />
        <p className="text-xs text-muted-foreground">Additional locations may incur extra travel charges</p>
      </div>

      {/* Preferred shoot date */}
      <div className="space-y-2">
        <Label>Preferred shoot date (optional)</Label>
        <Input
          type="date"
          value={(metadata.shootDatePreference || '') as string}
          onChange={(e) => onMetadataChange('shootDatePreference', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">We'll confirm availability and weather conditions</p>
      </div>

      {/* Special requirements */}
      <div className="space-y-2">
        <Label>Special requirements or notes (optional)</Label>
        <Textarea
          value={(metadata.specialRequirements || '') as string}
          onChange={(e) => onMetadataChange('specialRequirements', e.target.value)}
          placeholder="e.g., specific angles needed, access instructions, timing constraints"
          rows={3}
        />
      </div>
    </div>
  );
}
