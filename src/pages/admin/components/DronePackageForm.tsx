import { useForm, useFieldArray } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

interface ShotDefinition {
  shot_type: string;
  altitude_range: string;
  weight: number;
  required: boolean;
  description: string;
}

interface DronePackage {
  id: string;
  code: string;
  name: string;
  category: string;
  description?: string | null;
  price: number | string;
  edit_budget_minutes: number;
  reshoot_tolerance?: string | null;
  features?: string[] | null;
  shot_manifest?: ShotDefinition[] | null;
}

interface PackageFormData {
  code: string;
  name: string;
  category: string;
  description: string;
  price: number;
  edit_budget_minutes: number;
  reshoot_tolerance: string;
  features: string[];
  shot_manifest: ShotDefinition[];
}

interface DronePackageFormProps {
  package?: DronePackage;
  onSuccess: () => void;
}

export function DronePackageForm({ package: pkg, onSuccess }: DronePackageFormProps) {
  const queryClient = useQueryClient();

  const defaultShot: ShotDefinition = {
    shot_type: "",
    altitude_range: "100-200ft",
    weight: 1,
    required: true,
    description: "",
  };

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<PackageFormData>({
    defaultValues: pkg ? {
      code: pkg.code,
      name: pkg.name,
      category: pkg.category,
      description: pkg.description || "",
      price: Number(pkg.price),
      edit_budget_minutes: pkg.edit_budget_minutes,
      reshoot_tolerance: pkg.reshoot_tolerance || "medium",
      features: pkg.features || [],
      shot_manifest: (pkg.shot_manifest as ShotDefinition[]) || [],
    } : {
      code: "",
      name: "",
      category: "real_estate",
      description: "",
      price: 0,
      edit_budget_minutes: 60,
      reshoot_tolerance: "medium",
      features: [],
      shot_manifest: [],
    },
  });

  const { fields: shotFields, append: appendShot, remove: removeShot } = useFieldArray({
    control,
    name: "shot_manifest",
  });

  const { fields: featureFields, append: appendFeature, remove: removeFeature } = useFieldArray({
    control,
    name: "features" as any,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: PackageFormData) => {
      const payload = {
        code: data.code,
        name: data.name,
        category: data.category,
        description: data.description,
        price: data.price,
        edit_budget_minutes: data.edit_budget_minutes,
        reshoot_tolerance: data.reshoot_tolerance,
        features: data.features.filter(f => f),
        shot_manifest: JSON.parse(JSON.stringify(data.shot_manifest)) as Json,
      };

      if (pkg?.id) {
        const { error } = await supabase
          .from("drone_packages")
          .update(payload)
          .eq("id", pkg.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("drone_packages")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drone-packages-admin"] });
      toast.success(pkg ? "Package updated" : "Package created");
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  const features = watch("features") || [];

  return (
    <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))} className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="code">Package Code</Label>
          <Input
            id="code"
            {...register("code", { required: true })}
            placeholder="PHOTO_495"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Display Name</Label>
          <Input
            id="name"
            {...register("name", { required: true })}
            placeholder="Aerial Photos"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            value={watch("category")}
            onValueChange={(v) => setValue("category", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="real_estate">Real Estate</SelectItem>
              <SelectItem value="construction">Construction</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="price">Price ($)</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            {...register("price", { required: true, valueAsNumber: true })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit_budget_minutes">Edit Budget (minutes)</Label>
          <Input
            id="edit_budget_minutes"
            type="number"
            {...register("edit_budget_minutes", { required: true, valueAsNumber: true })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reshoot_tolerance">Reshoot Tolerance</Label>
          <Select
            value={watch("reshoot_tolerance")}
            onValueChange={(v) => setValue("reshoot_tolerance", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low (strict quality)</SelectItem>
              <SelectItem value="medium">Medium (balanced)</SelectItem>
              <SelectItem value="high">High (lenient)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register("description")}
          rows={2}
          placeholder="Package description..."
        />
      </div>

      <Separator />

      {/* Features */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Features</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendFeature("" as any)}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Feature
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {features.length === 0 ? (
            <p className="text-sm text-muted-foreground">No features added</p>
          ) : (
            features.map((_, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  {...register(`features.${index}` as const)}
                  placeholder="Feature description"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFeature(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Shot Manifest */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Shot Manifest</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendShot(defaultShot)}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Shot
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {shotFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No shots defined</p>
          ) : (
            shotFields.map((field, index) => (
              <Card key={field.id} className="bg-muted/30">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-grab" />
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Shot Type</Label>
                          <Input
                            {...register(`shot_manifest.${index}.shot_type` as const)}
                            placeholder="hero_front"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Altitude Range</Label>
                          <Input
                            {...register(`shot_manifest.${index}.altitude_range` as const)}
                            placeholder="100-200ft"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Weight</Label>
                          <Input
                            type="number"
                            step="0.1"
                            {...register(`shot_manifest.${index}.weight` as const, { valueAsNumber: true })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        <div className="col-span-3 space-y-1">
                          <Label className="text-xs">Description</Label>
                          <Input
                            {...register(`shot_manifest.${index}.description` as const)}
                            placeholder="Primary exterior shot from street level"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Required</Label>
                          <Select
                            value={watch(`shot_manifest.${index}.required`) ? "true" : "false"}
                            onValueChange={(v) => setValue(`shot_manifest.${index}.required`, v === "true")}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Yes</SelectItem>
                              <SelectItem value="false">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeShot(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Saving..." : pkg ? "Update Package" : "Create Package"}
        </Button>
      </div>
    </form>
  );
}
