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
import { ArrowLeft, Loader2, MapPin, Store } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ImageUploadField } from "../components/ImageUploadField";
import MapPickerModal from "../components/MapPickerModal";
import { useApp } from "../context/AppContext";
import { useCreateStore } from "../hooks/useQueries";
import { GLOBAL_DELIVERY_ZONE, isPointInPolygon } from "../utils/geofence";

const CATEGORIES = [
  "Grocery",
  "Snacks",
  "Fruits",
  "Beverages",
  "Bakery",
  "Dairy",
  "Electronics",
  "Other",
];

interface StoreForm {
  name: string;
  image: string;
  category: string;
  description: string;
  deliveryTime: string;
}

interface FormErrors {
  name?: string;
  category?: string;
  deliveryTime?: string;
  location?: string;
}

export default function CreateStorePage() {
  const { navigate } = useApp();
  const createStore = useCreateStore();

  const [form, setForm] = useState<StoreForm>({
    name: "",
    image: "",
    category: "",
    description: "",
    deliveryTime: "",
  });
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

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = "Store name is required";
    if (!form.category) e.category = "Please select a category";
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
        category: form.category,
        description: form.description.trim(),
        deliveryTime: form.deliveryTime.trim(),
        latitude: storeLocation.lat,
        longitude: storeLocation.lng,
      });
      toast.success("Store created successfully!");
      navigate("vendor-dashboard");
    } catch (e: any) {
      toast.error(e?.message || "Failed to create store.");
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate("vendor-dashboard")}
          className="flex items-center gap-1 text-sm font-semibold text-green-600 hover:text-green-700"
          data-ocid="create-store.back.button"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
            <Store className="w-5 h-5 text-green-500" />
            Create Your Store
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Set up your store to start selling
          </p>
        </div>
      </div>

      <div className="space-y-4" data-ocid="create-store.panel">
        {/* Store Name */}
        <div>
          <Label className="text-xs font-bold text-gray-700">
            Store Name <span className="text-red-500">*</span>
          </Label>
          <Input
            value={form.name}
            onChange={(e) => {
              setForm((f) => ({ ...f, name: e.target.value }));
              setErrors((er) => ({ ...er, name: undefined }));
            }}
            placeholder="e.g. Fresh Farm Grocery"
            className={`mt-1 text-sm ${
              errors.name ? "border-red-400" : "border-gray-300"
            }`}
            data-ocid="create-store.name.input"
          />
          {errors.name && (
            <p
              className="text-xs text-red-500 mt-1"
              data-ocid="create-store.name_error"
            >
              {errors.name}
            </p>
          )}
        </div>

        {/* Category */}
        <div>
          <Label className="text-xs font-bold text-gray-700">
            Category <span className="text-red-500">*</span>
          </Label>
          <Select
            value={form.category}
            onValueChange={(v) => {
              setForm((f) => ({ ...f, category: v }));
              setErrors((er) => ({ ...er, category: undefined }));
            }}
          >
            <SelectTrigger
              className={`mt-1 text-sm ${
                errors.category ? "border-red-400" : "border-gray-300"
              }`}
              data-ocid="create-store.category.select"
            >
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && (
            <p
              className="text-xs text-red-500 mt-1"
              data-ocid="create-store.category_error"
            >
              {errors.category}
            </p>
          )}
        </div>

        {/* Delivery Time */}
        <div>
          <Label className="text-xs font-bold text-gray-700">
            Delivery Time <span className="text-red-500">*</span>
          </Label>
          <Input
            value={form.deliveryTime}
            onChange={(e) => {
              setForm((f) => ({ ...f, deliveryTime: e.target.value }));
              setErrors((er) => ({ ...er, deliveryTime: undefined }));
            }}
            placeholder="e.g. 15-20 min"
            className={`mt-1 text-sm ${
              errors.deliveryTime ? "border-red-400" : "border-gray-300"
            }`}
            data-ocid="create-store.delivery-time.input"
          />
          {errors.deliveryTime && (
            <p
              className="text-xs text-red-500 mt-1"
              data-ocid="create-store.delivery_time_error"
            >
              {errors.deliveryTime}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <Label className="text-xs font-bold text-gray-700">Description</Label>
          <Textarea
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="Tell customers about your store..."
            rows={3}
            className="mt-1 text-sm border-gray-300 resize-none"
            data-ocid="create-store.description.textarea"
          />
        </div>

        {/* Store Location */}
        <div>
          <Label className="text-xs font-bold text-gray-700">
            Store Location <span className="text-red-500">*</span>
          </Label>
          <p className="text-[11px] text-gray-400 mb-2">
            Pin your store on the map. Must be inside the service area. This
            cannot be changed after creation.
          </p>

          {/* Pick / Change button */}
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
                  ? "border-red-400 text-red-600 hover:bg-red-50"
                  : "border-green-400 text-green-700 hover:bg-green-50"
              }`}
              data-ocid="create-store.location.open_modal_button"
            >
              <MapPin className="w-4 h-4" />
              Pick Store Location on Map
            </Button>
          ) : (
            <div className="space-y-2">
              {/* Coordinates display */}
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span className="text-xs text-gray-700 font-mono">
                  📍 Location set: {storeLocation.lat.toFixed(5)},{" "}
                  {storeLocation.lng.toFixed(5)}
                </span>
              </div>

              {/* Inside / outside badge */}
              {locationInsideZone === true ? (
                <div
                  className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2"
                  data-ocid="create-store.location.success_state"
                >
                  <span className="text-xs font-bold text-green-700">
                    ✅ Inside service area
                  </span>
                </div>
              ) : (
                <div
                  className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2"
                  data-ocid="create-store.location.error_state"
                >
                  <span className="text-xs font-bold text-red-600">
                    ❌ Outside service area — Store must be inside service area
                  </span>
                </div>
              )}

              {/* Change location button */}
              <Button
                type="button"
                variant="outline"
                onClick={() => setMapOpen(true)}
                className="w-full h-9 text-xs font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-xl"
                data-ocid="create-store.location.edit_button"
              >
                <MapPin className="w-3.5 h-3.5 mr-1" />
                Change Location
              </Button>
            </div>
          )}

          {errors.location && (
            <p
              className="text-xs text-red-500 mt-1.5"
              data-ocid="create-store.location_error"
            >
              {errors.location}
            </p>
          )}
        </div>

        {/* Store Image */}
        <div>
          <Label className="text-xs font-bold text-gray-700">Store Image</Label>
          <p className="text-[11px] text-gray-400 mb-1.5">
            Optional — pick a photo from your gallery
          </p>
          <ImageUploadField
            value={form.image}
            onChange={(url) => setForm((f) => ({ ...f, image: url }))}
            onError={(msg) => toast.error(msg)}
          />
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={createStore.isPending}
          className="w-full h-12 text-base font-extrabold bg-green-500 hover:bg-green-600 text-white rounded-xl shadow"
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
