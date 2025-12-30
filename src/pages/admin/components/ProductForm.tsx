import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import ImageUpload from "@/components/admin/ImageUpload";

export interface ProductSize {
  label: string;
  dimensions: string;
  price: number;
}

export interface ProductFormData {
  name: string;
  color: string;
  price: number;
  original_price: number | null;
  image: string;
  description: string;
  features: string[];
  category: string;
  coming_soon: boolean;
  sizes: ProductSize[] | null;
  active: boolean;
}

interface ProductFormProps {
  initialData?: ProductFormData;
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

const CATEGORY_OPTIONS = [
  { value: "merchandise", label: "Merchandise" },
  { value: "aerial-art", label: "Aerial Art" },
];

export default function ProductForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
}: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>(
    initialData || {
      name: "",
      color: "",
      price: 0,
      original_price: null,
      image: "",
      description: "",
      features: [""],
      category: "merchandise",
      coming_soon: false,
      sizes: null,
      active: true,
    }
  );

  const updateField = <K extends keyof ProductFormData>(
    field: K,
    value: ProductFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addFeature = () => {
    setFormData((prev) => ({ ...prev, features: [...prev.features, ""] }));
  };

  const updateFeature = (index: number, value: string) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData((prev) => ({ ...prev, features: newFeatures }));
  };

  const removeFeature = (index: number) => {
    const newFeatures = formData.features.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, features: newFeatures }));
  };

  const addSize = () => {
    const newSizes = formData.sizes || [];
    setFormData((prev) => ({
      ...prev,
      sizes: [...newSizes, { label: "", dimensions: "", price: 0 }],
    }));
  };

  const updateSize = (index: number, field: keyof ProductSize, value: string | number) => {
    const newSizes = [...(formData.sizes || [])];
    newSizes[index] = { ...newSizes[index], [field]: value };
    setFormData((prev) => ({ ...prev, sizes: newSizes }));
  };

  const removeSize = (index: number) => {
    const newSizes = (formData.sizes || []).filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, sizes: newSizes.length ? newSizes : null }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedData = {
      ...formData,
      features: formData.features.filter((f) => f.trim() !== ""),
    };
    onSubmit(cleanedData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Product Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => updateField("name", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="color">Color / Variant *</Label>
          <Input
            id="color"
            value={formData.color}
            onChange={(e) => updateField("color", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="price">Price *</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0"
            value={formData.price}
            onChange={(e) => updateField("price", parseFloat(e.target.value) || 0)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="original_price">Original Price (for sales)</Label>
          <Input
            id="original_price"
            type="number"
            step="0.01"
            min="0"
            value={formData.original_price || ""}
            onChange={(e) =>
              updateField(
                "original_price",
                e.target.value ? parseFloat(e.target.value) : null
              )
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => updateField("category", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ImageUpload
        value={formData.image}
        onChange={(url) => updateField("image", url)}
      />

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => updateField("description", e.target.value)}
          rows={3}
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Features</Label>
          <Button type="button" variant="outline" size="sm" onClick={addFeature}>
            <Plus className="mr-1 h-3 w-3" /> Add
          </Button>
        </div>
        <div className="space-y-2">
          {formData.features.map((feature, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={feature}
                onChange={(e) => updateFeature(index, e.target.value)}
                placeholder="Feature description"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeFeature(index)}
                disabled={formData.features.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {formData.category === "aerial-art" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Sizes (optional)</Label>
            <Button type="button" variant="outline" size="sm" onClick={addSize}>
              <Plus className="mr-1 h-3 w-3" /> Add Size
            </Button>
          </div>
          {formData.sizes && formData.sizes.length > 0 && (
            <div className="space-y-2">
              {formData.sizes.map((size, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-xs">Label</Label>
                    <Input
                      value={size.label}
                      onChange={(e) => updateSize(index, "label", e.target.value)}
                      placeholder="Small"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Dimensions</Label>
                    <Input
                      value={size.dimensions}
                      onChange={(e) => updateSize(index, "dimensions", e.target.value)}
                      placeholder='12" x 8"'
                    />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs">Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={size.price}
                      onChange={(e) =>
                        updateSize(index, "price", parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSize(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-6">
        <div className="flex items-center gap-2">
          <Switch
            id="active"
            checked={formData.active}
            onCheckedChange={(checked) => updateField("active", checked)}
          />
          <Label htmlFor="active">Active (visible in shop)</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="coming_soon"
            checked={formData.coming_soon}
            onCheckedChange={(checked) => updateField("coming_soon", checked)}
          />
          <Label htmlFor="coming_soon">Coming Soon</Label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : initialData ? "Update Product" : "Create Product"}
        </Button>
      </div>
    </form>
  );
}
