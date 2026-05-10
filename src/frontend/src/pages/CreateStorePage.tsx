import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Loader2, MapPin, Store, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ImageUrlGenerator } from "../components/ImageUrlGenerator";
import MapPickerModal from "../components/MapPickerModal";
import { useApp } from "../context/AppContext";
import { useCreateStore } from "../hooks/useQueries";
import { GLOBAL_DELIVERY_ZONE, isPointInPolygon } from "../utils/geofence";

export const UNIFIED_CATEGORIES = [
  "Stationery",
  "Grocery",
  "Fruits",
  "Fashion",
  "Toys",
] as const;

const CATEGORY_ICONS: Record<string, string> = {
  Stationery: "📚",
  Grocery: "🛒",
  Fruits: "🍎",
  Fashion: "👗",
  Toys: "🧸",
};

const DELIVERY_TIME_OPTIONS = [
  "15-20 min",
  "20-30 min",
  "30-45 min",
  "45-60 min",
];

interface StoreForm {
  name: string;
  image: string;
  description: string;
  deliveryTime: string;
}

interface FormErrors {
  name?: string;
  categories?: string;
  deliveryTime?: string;
  location?: string;
}

export default function CreateStorePage() {
  const navigate = useNavigate();
  const createStore = useCreateStore();

  const [form, setForm] = useState<StoreForm>({
    name: "",
    image: "",
    description: "",
    deliveryTime: "",
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [storeLocation, setStoreLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [mapOpen, setMapOpen] = useState(false);

  const locationInsideZone =
    storeLocation !== null
      ? isPointInPolygon(
          storeLocation.lat,
          storeLocation.lng,
          GLOBAL_DELIVERY_ZONE,
        )
      : null;

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
    setErrors((er) => ({ ...er, categories: undefined }));
  };

  const removeCategory = (cat: string) => {
    setSelectedCategories((prev) => prev.filter((c) => c !== cat));
  };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = "Store name is required";
    if (selectedCategories.length === 0)
      e.categories = "Please select at least one category";
    if (!form.deliveryTime.trim()) e.deliveryTime = "Delivery time is required";
    if (!storeLocation) {
      e.location = "Please select your store location on the map";
    } else if (!locationInsideZone) {
      e.location = "Store must be inside service area";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!storeLocation) return;
    try {
      await createStore.mutateAsync({
        name: form.name.trim(),
        image: form.image.trim(),
        categories: selectedCategories,
        description: form.description.trim(),
        deliveryTime: form.deliveryTime.trim(),
        latitude: storeLocation.lat,
        longitude: storeLocation.lng,
      });
      toast.success("Store created successfully!");
      navigate({ to: "/vendor" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create store.");
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate({ to: "/vendor" })}
          className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          data-ocid="create-store.back.button"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-foreground flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" />
            Create Your Store
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Set up your store to start selling
          </p>
        </div>
      </div>

      <div className="space-y-4" data-ocid="create-store.panel">
        {/* Store Name */}
        <div>
          <Label className="text-xs font-bold text-foreground">
            Store Name <span className="text-destructive">*</span>
          </Label>
          <Input
            value={form.name}
            onChange={(e) => {
              setForm((f) => ({ ...f, name: e.target.value }));
              setErrors((er) => ({ ...er, name: undefined }));
            }}
            placeholder="e.g. Fresh Farm Grocery"
            className={`mt-1 text-sm ${errors.name ? "border-destructive" : ""}`}
            data-ocid="create-store.name.input"
          />
          {errors.name && (
            <p
              className="text-xs text-destructive mt-1"
              data-ocid="create-store.name_error"
            >
              {errors.name}
            </p>
          )}
        </div>

        {/* Categories — multi-select */}
        <div>
          <Label className="text-xs font-bold text-foreground">
            Categories <span className="text-destructive">*</span>
          </Label>
          <p className="text-[11px] text-muted-foreground mb-2 mt-0.5">
            Select all categories your store sells in
          </p>

          {/* Category toggle buttons */}
          <div
            className="flex flex-wrap gap-2"
            data-ocid="create-store.categories.list"
          >
            {UNIFIED_CATEGORIES.map((cat) => {
              const selected = selectedCategories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  data-ocid={`create-store.category.${cat.toLowerCase()}`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                    selected
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card text-foreground border-border hover:border-primary/60 hover:text-primary"
                  }`}
                >
                  <span>{CATEGORY_ICONS[cat]}</span>
                  {cat}
                  {selected && <Check className="w-3 h-3" />}
                </button>
              );
            })}
          </div>

          {/* Selected tags */}
          {selectedCategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {selectedCategories.map((cat) => (
                <Badge
                  key={cat}
                  className="gap-1 bg-primary/10 text-primary border border-primary/30 text-xs font-semibold pr-1"
                >
                  {CATEGORY_ICONS[cat]} {cat}
                  <button
                    type="button"
                    onClick={() => removeCategory(cat)}
                    className="ml-0.5 w-4 h-4 rounded-full hover:bg-primary/20 flex items-center justify-center"
                    aria-label={`Remove ${cat}`}
                    data-ocid={`create-store.category_remove.${cat.toLowerCase()}`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {errors.categories && (
            <p
              className="text-xs text-destructive mt-1.5"
              data-ocid="create-store.categories_error"
            >
              {errors.categories}
            </p>
          )}
        </div>

        {/* Delivery Time — Dropdown */}
        <div>
          <Label className="text-xs font-bold text-foreground">
            Delivery Time <span className="text-destructive">*</span>
          </Label>
          <Select
            value={form.deliveryTime}
            onValueChange={(v) => {
              setForm((f) => ({ ...f, deliveryTime: v }));
              setErrors((er) => ({ ...er, deliveryTime: undefined }));
            }}
          >
            <SelectTrigger
              className={`mt-1 text-sm ${errors.deliveryTime ? "border-destructive" : ""}`}
              data-ocid="create-store.delivery-time.select"
            >
              <SelectValue placeholder="Select delivery time" />
            </SelectTrigger>
            <SelectContent>
              {DELIVERY_TIME_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.deliveryTime && (
            <p
              className="text-xs text-destructive mt-1"
              data-ocid="create-store.delivery_time_error"
            >
              {errors.deliveryTime}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <Label className="text-xs font-bold text-foreground">
            Description
          </Label>
          <Textarea
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="Tell customers about your store..."
            rows={3}
            className="mt-1 text-sm resize-none"
            data-ocid="create-store.description.textarea"
          />
        </div>

        {/* Store Location */}
        <div>
          <Label className="text-xs font-bold text-foreground">
            Store Location <span className="text-destructive">*</span>
          </Label>
          <p className="text-[11px] text-muted-foreground mb-2">
            Pin your store on the map. Must be inside the service area.
          </p>

          {!storeLocation ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setErrors((er) => ({ ...er, location: undefined }));
                setMapOpen(true);
              }}
              className={`w-full h-11 text-sm font-bold border-2 rounded-xl flex items-center gap-2 ${
                errors.location
                  ? "border-destructive text-destructive hover:bg-destructive/5"
                  : "border-primary/50 text-primary hover:bg-primary/5"
              }`}
              data-ocid="create-store.location.open_modal_button"
            >
              <MapPin className="w-4 h-4" />
              Pick Store Location on Map
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-muted border border-border rounded-xl px-3 py-2.5">
                <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-foreground font-mono">
                  📍 {storeLocation.lat.toFixed(5)},{" "}
                  {storeLocation.lng.toFixed(5)}
                </span>
              </div>

              {locationInsideZone === true ? (
                <div
                  className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-xl px-3 py-2"
                  data-ocid="create-store.location.success_state"
                >
                  <span className="text-xs font-bold text-primary">
                    ✅ Inside service area
                  </span>
                </div>
              ) : (
                <div
                  className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2"
                  data-ocid="create-store.location.error_state"
                >
                  <span className="text-xs font-bold text-destructive">
                    ❌ Outside service area — must be inside delivery zone
                  </span>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={() => setMapOpen(true)}
                className="w-full h-9 text-xs font-semibold rounded-xl"
                data-ocid="create-store.location.edit_button"
              >
                <MapPin className="w-3.5 h-3.5 mr-1" />
                Change Location
              </Button>
            </div>
          )}

          {errors.location && (
            <p
              className="text-xs text-destructive mt-1.5"
              data-ocid="create-store.location_error"
            >
              {errors.location}
            </p>
          )}
        </div>

        {/* Store Image */}
        <div>
          <Label className="text-xs font-bold text-foreground">
            Store Image
          </Label>
          <p className="text-[11px] text-muted-foreground mb-1.5">
            Optional — paste a direct image URL
          </p>
          <ImageUrlGenerator
            value={form.image}
            onChange={(url) => setForm((f) => ({ ...f, image: url }))}
            label="Store Image"
          />
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={createStore.isPending}
          style={{ backgroundColor: "#16a34a" }}
          className="w-full h-12 text-base font-extrabold text-white rounded-xl shadow hover:opacity-90 transition-opacity"
          data-ocid="create-store.submit_button"
        >
          {createStore.isPending ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Creating Store...
            </>
          ) : (
            <>
              <Store className="w-5 h-5 mr-2" />
              Create Store
            </>
          )}
        </Button>
      </div>

      {/* Map Picker Modal */}
      <MapPickerModal
        open={mapOpen}
        initialLat={storeLocation?.lat}
        initialLng={storeLocation?.lng}
        deliveryZone={GLOBAL_DELIVERY_ZONE}
        onConfirm={(lat, lng) => {
          setStoreLocation({ lat, lng });
          setErrors((er) => ({ ...er, location: undefined }));
          setMapOpen(false);
        }}
        onClose={() => setMapOpen(false)}
      />
    </div>
  );
}
