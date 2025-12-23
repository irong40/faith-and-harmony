import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Camera, Video, FileImage, Clock, Info } from "lucide-react";

interface FieldProps {
  metadata: Record<string, any>;
  onMetadataChange: (key: string, value: any) => void;
}

const WORK_CATEGORIES = [
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'construction', label: 'Construction' }
];

const REAL_ESTATE_PACKAGES = [
  {
    code: 'PHOTO_299',
    name: 'Aerial Photo Pack',
    price: 299,
    turnaround: '48 hours',
    photos: 12,
    videos: 0,
    raw: false,
    description: '12 edited photos in MLS-ready and high-resolution formats'
  },
  {
    code: 'PHOTO_VIDEO_699',
    name: 'Aerial Photo + Highlight Video',
    price: 699,
    turnaround: '72 hours',
    photos: 20,
    videos: 1,
    raw: false,
    description: '20 photos + 60-90 second highlight video'
  },
  {
    code: 'PREMIUM_1250',
    name: 'Premium Listing Media',
    price: 1250,
    turnaround: '3-4 business days',
    photos: 30,
    videos: 1,
    raw: true,
    description: '30 photos (aerial + ground) + 2-3 minute video + raw footage'
  }
];

const CONSTRUCTION_PACKAGES = [
  {
    code: 'PROGRESS_450',
    name: 'Progress Visit (Single)',
    price: 450,
    turnaround: '48 hours',
    photos: 25,
    videos: 4,
    raw: false,
    description: '25 labeled photos + 4 short video clips'
  },
  {
    code: 'RETAINER_1_MONTH',
    name: 'Monthly Retainer (1 visit/month)',
    price: 1200,
    turnaround: '48 hours per visit',
    photos: 25,
    videos: 4,
    raw: false,
    description: 'Same deliverables per visit, committed scheduling'
  },
  {
    code: 'RETAINER_2_MONTH',
    name: 'Monthly Retainer (2 visits/month)',
    price: 2100,
    turnaround: '48 hours per visit',
    photos: 25,
    videos: 4,
    raw: false,
    description: 'Same deliverables per visit, committed scheduling'
  },
  {
    code: 'RETAINER_WEEKLY',
    name: 'Weekly Retainer',
    price: 3000,
    turnaround: '48 hours per visit',
    photos: 25,
    videos: 4,
    raw: false,
    description: '4 visits/month, same deliverables per visit'
  }
];

const ADD_ONS = [
  { code: 'CHANGE_ORDER', name: 'Change-order support photo set', price: 150, description: 'Extra 10 labeled photos' },
  { code: 'RECAP_VIDEO', name: 'End-of-month recap video', price: 350, description: '60-90 second recap' }
];

export function AerialFields({ metadata, onMetadataChange }: FieldProps) {
  const workCategory = metadata.workCategory || '';
  const selectedPackageCode = metadata.selectedPackage || '';
  const selectedAddOns: string[] = metadata.addOns || [];
  
  const packages = workCategory === 'real_estate' ? REAL_ESTATE_PACKAGES : 
                   workCategory === 'construction' ? CONSTRUCTION_PACKAGES : [];
  
  const selectedPackage = packages.find(p => p.code === selectedPackageCode);
  
  // Calculate estimated total
  const packagePrice = selectedPackage?.price || 0;
  const addOnsPrice = selectedAddOns.reduce((sum, code) => {
    const addon = ADD_ONS.find(a => a.code === code);
    return sum + (addon?.price || 0);
  }, 0);
  const estimatedTotal = packagePrice + addOnsPrice;

  // Update estimated total when it changes
  const handlePackageChange = (code: string) => {
    onMetadataChange('selectedPackage', code);
    const pkg = packages.find(p => p.code === code);
    if (pkg) {
      onMetadataChange('estimatedTotal', pkg.price + addOnsPrice);
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

  // Clear package when category changes
  const handleCategoryChange = (value: string) => {
    onMetadataChange('workCategory', value);
    onMetadataChange('selectedPackage', '');
    onMetadataChange('addOns', []);
    onMetadataChange('estimatedTotal', 0);
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
                  {pkg.name} — ${pkg.price.toLocaleString()}
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
            <span className="text-xl font-bold text-primary">${selectedPackage.price.toLocaleString()}</span>
          </div>
          
          <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
            <div className="flex items-center gap-1.5 text-sm">
              <Camera className="w-4 h-4 text-accent" />
              <span>{selectedPackage.photos} photos</span>
            </div>
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

      {/* Estimated Total */}
      {selectedPackage && (
        <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-accent" />
            <span className="font-medium text-primary">Estimated Total</span>
          </div>
          <span className="text-2xl font-bold text-primary">${estimatedTotal.toLocaleString()}</span>
        </div>
      )}

      {/* Property Address */}
      <div className="space-y-2">
        <Label>Property or site address</Label>
        <Input
          value={metadata.propertyAddress || ''}
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
          value={metadata.locationCount || '1'}
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
          value={metadata.shootDatePreference || ''}
          onChange={(e) => onMetadataChange('shootDatePreference', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">We'll confirm availability and weather conditions</p>
      </div>

      {/* Special requirements */}
      <div className="space-y-2">
        <Label>Special requirements or notes (optional)</Label>
        <Input
          value={metadata.specialRequirements || ''}
          onChange={(e) => onMetadataChange('specialRequirements', e.target.value)}
          placeholder="e.g., specific angles needed, access instructions, timing constraints"
        />
      </div>
    </div>
  );
}
