import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin,
  Minus,
  Navigation,
  Plus,
  ShoppingCart,
  Store,
  Trash2,
  User,
  Users,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import ConfirmModal from "../components/ConfirmModal";
import MapPickerModal from "../components/MapPickerModal";
import { useApp } from "../context/AppContext";
import { useCart } from "../context/CartContext";
import { useCreateOrder } from "../hooks/useQueries";
import { GLOBAL_DELIVERY_ZONE, isPointInPolygon } from "../utils/geofence";

interface CustomerDetails {
  name: string;
  phone: string;
  address: string;
}

type DeliveryOption = "instant" | "group" | null;

export default function CartPage() {
  const {
    items,
    increaseQty,
    decreaseQty,
    removeItem,
    clearCart,
    totalPrice,
    currentStoreId,
  } = useCart();
  const { navigate } = useApp();
  const createOrder = useCreateOrder();
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    message: string;
    action: (() => void) | null;
  }>({ open: false, message: "", action: null });
  const [mapOpen, setMapOpen] = useState(false);
  const [pinnedLocation, setPinnedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Delivery option state — only relevant when totalPrice < 100; default to "group"
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>("group");

  const [customer, setCustomer] = useState<CustomerDetails>(() => {
    try {
      const saved = localStorage.getItem("riva_customer");
      return saved ? JSON.parse(saved) : { name: "", phone: "", address: "" };
    } catch {
      return { name: "", phone: "", address: "" };
    }
  });
  const [formErrors, setFormErrors] = useState<
    Partial<CustomerDetails & { pin: string; delivery: string }>
  >({});

  // Delivery fee logic
  const deliveryFee = useMemo(() => {
    if (totalPrice >= 100) return 9; // standard delivery
    if (deliveryOption === "instant") return 15;
    if (deliveryOption === "group") return 5;
    return 0; // not yet selected
  }, [totalPrice, deliveryOption]);

  const finalTotal = totalPrice + deliveryFee;

  const zoneStatus = useMemo(() => {
    if (!pinnedLocation) return "no_pin";
    const inside = isPointInPolygon(
      pinnedLocation.lat,
      pinnedLocation.lng,
      GLOBAL_DELIVERY_ZONE,
    );
    return inside ? "in_range" : "out_of_range";
  }, [pinnedLocation]);

  const canOrder = zoneStatus === "in_range" && currentStoreId !== null;

  const handleFieldChange = (field: keyof CustomerDetails, value: string) => {
    setCustomer((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleDeliverySelect = (option: DeliveryOption) => {
    setDeliveryOption(option);
    if (formErrors.delivery) {
      setFormErrors((prev) => ({ ...prev, delivery: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<CustomerDetails & { pin: string; delivery: string }> =
      {};
    if (!customer.name.trim()) errors.name = "Name is required";
    if (!customer.phone.trim()) errors.phone = "Phone number is required";
    if (!customer.address.trim()) errors.address = "Address is required";
    if (!pinnedLocation)
      errors.pin = "Please pin your delivery location on the map";
    if (!currentStoreId)
      errors.pin = "No store selected — go back and shop from a store";
    if (totalPrice < 100 && deliveryOption === null)
      errors.delivery = "Please select a delivery option";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePinConfirm = (lat: number, lng: number) => {
    setPinnedLocation({ lat, lng });
    setMapOpen(false);
    setFormErrors((prev) => ({ ...prev, pin: undefined }));
    const inside = isPointInPolygon(lat, lng, GLOBAL_DELIVERY_ZONE);
    if (inside) {
      toast.success("Location pinned! Delivery available ✅");
    } else {
      toast.error("Location outside delivery zone ❌");
    }
  };

  const handlePlaceOrder = () => {
    if (items.length === 0) return;
    if (!validateForm()) {
      toast.error("Please fill in all details and pin your location.");
      return;
    }
    if (!canOrder) {
      if (!currentStoreId) {
        toast.error("No store selected. Go back and shop from a store.");
      } else {
        toast.error("Your pinned location is outside the delivery zone.");
      }
      return;
    }
    const summary = items.map((i) => `${i.name} x${i.quantity}`).join(", ");
    const deliveryLabel =
      totalPrice >= 100
        ? "Standard Delivery (₹9)"
        : deliveryOption === "group"
          ? "Group Delivery (₹5)"
          : "Instant Delivery (₹15)";
    setConfirmModal({
      open: true,
      message: `Place order for: ${summary}?\nTotal: ₹${finalTotal} (${deliveryLabel})`,
      action: async () => {
        try {
          localStorage.setItem("riva_customer", JSON.stringify(customer));
          const newOrderId = await createOrder.mutateAsync({
            storeId: currentStoreId!,
            itemName: summary,
            customerName: customer.name.trim(),
            customerPhone: customer.phone.trim(),
            customerAddress: customer.address.trim(),
            pinnedLatitude: pinnedLocation!.lat,
            pinnedLongitude: pinnedLocation!.lng,
            totalAmount: finalTotal,
          });
          // Store createdAt timestamp for expiry logic
          try {
            const timestamps: Record<string, number> = JSON.parse(
              localStorage.getItem("riva_order_timestamps") || "{}",
            );
            timestamps[newOrderId.toString()] = Date.now();
            localStorage.setItem(
              "riva_order_timestamps",
              JSON.stringify(timestamps),
            );
          } catch {}
          clearCart();
          toast.success("Order placed successfully!");
          navigate("customer-dashboard");
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Failed to place order.";
          toast.error(msg);
        }
      },
    });
  };

  const zoneBanner = () => {
    if (zoneStatus === "in_range") {
      return (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <MapPin className="w-4 h-4 text-green-600" />
            <span className="text-sm font-semibold text-green-700">
              ✅ Delivery Available — Inside Delivery Zone
            </span>
          </div>
        </div>
      );
    }
    if (zoneStatus === "out_of_range") {
      return (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <MapPin className="w-4 h-4 text-red-500" />
            <span className="text-sm font-semibold text-red-600">
              ❌ Outside delivery zone — change pin location
            </span>
          </div>
        </div>
      );
    }
    return (
      <div className="mb-3">
        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <MapPin className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-500">
            Pin your delivery location to check availability
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <ConfirmModal
        open={confirmModal.open}
        message={confirmModal.message}
        onConfirm={() => {
          confirmModal.action?.();
          setConfirmModal({ open: false, message: "", action: null });
        }}
        onCancel={() =>
          setConfirmModal({ open: false, message: "", action: null })
        }
      />

      <MapPickerModal
        open={mapOpen}
        initialLat={pinnedLocation?.lat}
        initialLng={pinnedLocation?.lng}
        onConfirm={handlePinConfirm}
        onClose={() => setMapOpen(false)}
        deliveryZone={GLOBAL_DELIVERY_ZONE}
      />

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() =>
            navigate(currentStoreId ? "store-detail" : "store-list")
          }
          className="text-sm font-semibold text-primary hover:underline"
        >
          ← Back
        </button>
        <h1 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-green-500" />
          Your Cart
        </h1>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-semibold">Your cart is empty</p>
          <p className="text-sm mt-1">Add items from a store to get started.</p>
          <Button
            className="mt-4 bg-green-500 hover:bg-green-600 text-white font-bold"
            onClick={() => navigate("store-list")}
            data-ocid="cart.browse.button"
          >
            Browse Stores
          </Button>
        </div>
      ) : (
        <>
          {/* Cart items */}
          <div className="space-y-3 mb-6">
            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  layout
                >
                  <Card className="border border-gray-100 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            ₹{item.price} each
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => decreaseQty(item.id)}
                            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 font-bold transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-5 text-center font-extrabold text-gray-900 text-sm">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => increaseQty(item.id)}
                            className="w-7 h-7 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-white font-bold transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="text-right min-w-[52px]">
                          <p className="font-extrabold text-gray-900 text-sm">
                            ₹{item.price * item.quantity}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-red-400 hover:text-red-600 transition-colors ml-1"
                          aria-label="Remove item"
                          data-ocid="cart.remove.button"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Delivery Option Selection (only when order < ₹100) */}
          {totalPrice < 100 ? (
            <div className="mb-4">
              <p className="text-sm font-extrabold text-gray-900 mb-2">
                Choose Delivery Type
              </p>
              <div className="grid grid-cols-2 gap-3">
                {/* Instant Delivery */}
                <button
                  type="button"
                  onClick={() => handleDeliverySelect("instant")}
                  data-ocid="cart.instant_delivery.toggle"
                  className={`flex flex-col items-center gap-1.5 border-2 rounded-xl p-4 transition-all ${
                    deliveryOption === "instant"
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 bg-white hover:border-green-300"
                  }`}
                >
                  <Zap
                    className={`w-6 h-6 ${
                      deliveryOption === "instant"
                        ? "text-green-600"
                        : "text-gray-400"
                    }`}
                  />
                  <span
                    className={`text-xs font-bold leading-tight text-center ${
                      deliveryOption === "instant"
                        ? "text-green-700"
                        : "text-gray-700"
                    }`}
                  >
                    ⚡ Instant Delivery
                  </span>
                  <span
                    className={`text-base font-extrabold ${
                      deliveryOption === "instant"
                        ? "text-green-700"
                        : "text-gray-800"
                    }`}
                  >
                    ₹15
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium">
                    10–15 mins
                  </span>
                  {deliveryOption === "instant" && (
                    <span className="text-[10px] font-semibold text-green-600 bg-green-100 rounded-full px-2 py-0.5">
                      Selected
                    </span>
                  )}
                </button>

                {/* Group Delivery */}
                <button
                  type="button"
                  onClick={() => handleDeliverySelect("group")}
                  data-ocid="cart.group_delivery.toggle"
                  className={`flex flex-col items-center gap-1.5 border-2 rounded-xl p-4 transition-all ${
                    deliveryOption === "group"
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 bg-white hover:border-green-300"
                  }`}
                >
                  <Users
                    className={`w-6 h-6 ${
                      deliveryOption === "group"
                        ? "text-green-600"
                        : "text-gray-400"
                    }`}
                  />
                  <span
                    className={`text-xs font-bold leading-tight text-center ${
                      deliveryOption === "group"
                        ? "text-green-700"
                        : "text-gray-700"
                    }`}
                  >
                    👥 Group Delivery
                  </span>
                  <span
                    className={`text-base font-extrabold ${
                      deliveryOption === "group"
                        ? "text-green-700"
                        : "text-gray-800"
                    }`}
                  >
                    ₹5
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium">
                    20–30 mins
                  </span>
                  <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5">
                    Most Affordable
                  </span>
                  {deliveryOption === "group" && (
                    <span className="text-[10px] font-semibold text-green-600 bg-green-100 rounded-full px-2 py-0.5">
                      Selected
                    </span>
                  )}
                </button>
              </div>
              {formErrors.delivery && (
                <p
                  className="text-xs text-red-500 mt-2"
                  data-ocid="cart.delivery_error"
                >
                  {formErrors.delivery}
                </p>
              )}
            </div>
          ) : (
            /* Standard Delivery for orders >= ₹100 */
            <div className="mb-4">
              <p className="text-sm font-extrabold text-gray-900 mb-2">
                Delivery Type
              </p>
              <div className="flex items-center gap-3 border-2 border-green-500 bg-green-50 rounded-xl p-4">
                <Zap className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-green-700">
                    Standard Delivery
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Scheduled delivery for your order
                  </p>
                </div>
                <span className="text-base font-extrabold text-green-700">
                  ₹9
                </span>
              </div>
            </div>
          )}

          {/* Charges Breakdown */}
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-6 shadow-sm">
            <div className="flex items-center justify-between py-1.5">
              <span className="text-sm text-gray-600">Items Total</span>
              <span className="text-sm font-semibold text-gray-900">
                ₹{totalPrice}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-sm text-gray-600 flex items-center gap-1">
                {totalPrice >= 100 ? (
                  <>
                    <Zap className="w-3.5 h-3.5 text-yellow-500" />
                    Standard Delivery
                  </>
                ) : deliveryOption === "group" ? (
                  <>
                    <Users className="w-3.5 h-3.5 text-blue-500" />
                    Group Delivery
                  </>
                ) : deliveryOption === "instant" ? (
                  <>
                    <Zap className="w-3.5 h-3.5 text-yellow-500" />
                    Instant Delivery
                  </>
                ) : (
                  "Delivery"
                )}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {deliveryFee > 0 ? `₹${deliveryFee}` : "—"}
              </span>
            </div>
            <div className="border-t border-gray-100 mt-1 pt-2 flex items-center justify-between">
              <span className="font-extrabold text-gray-900">Total</span>
              <span className="font-extrabold text-green-700 text-lg">
                ₹{finalTotal}
              </span>
            </div>
          </div>

          {/* Customer Details Form */}
          <div className="mb-5 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-extrabold text-gray-900 flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-green-500" />
              Delivery Details
            </h2>

            <div className="space-y-3">
              {/* Name */}
              <div>
                <label
                  htmlFor="customer-name"
                  className="block text-xs font-bold text-gray-700 mb-1"
                >
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="customer-name"
                  type="text"
                  placeholder="Enter your name"
                  value={customer.name}
                  onChange={(e) => handleFieldChange("name", e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 ${
                    formErrors.name
                      ? "border-red-400 bg-red-50"
                      : "border-gray-300 bg-white"
                  }`}
                  data-ocid="cart.name.input"
                />
                {formErrors.name && (
                  <p
                    className="text-xs text-red-500 mt-1"
                    data-ocid="cart.name_error"
                  >
                    {formErrors.name}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label
                  htmlFor="customer-phone"
                  className="block text-xs font-bold text-gray-700 mb-1"
                >
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  id="customer-phone"
                  type="tel"
                  placeholder="Enter phone number"
                  value={customer.phone}
                  onChange={(e) => handleFieldChange("phone", e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 ${
                    formErrors.phone
                      ? "border-red-400 bg-red-50"
                      : "border-gray-300 bg-white"
                  }`}
                  data-ocid="cart.phone.input"
                />
                {formErrors.phone && (
                  <p
                    className="text-xs text-red-500 mt-1"
                    data-ocid="cart.phone_error"
                  >
                    {formErrors.phone}
                  </p>
                )}
              </div>

              {/* Address */}
              <div>
                <label
                  htmlFor="customer-address"
                  className="block text-xs font-bold text-gray-700 mb-1"
                >
                  Delivery Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="customer-address"
                  placeholder="Enter your full delivery address"
                  value={customer.address}
                  onChange={(e) => handleFieldChange("address", e.target.value)}
                  rows={3}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 resize-none ${
                    formErrors.address
                      ? "border-red-400 bg-red-50"
                      : "border-gray-300 bg-white"
                  }`}
                  data-ocid="cart.address.textarea"
                />
                {formErrors.address && (
                  <p
                    className="text-xs text-red-500 mt-1"
                    data-ocid="cart.address_error"
                  >
                    {formErrors.address}
                  </p>
                )}
              </div>

              {/* Pin Location */}
              <div>
                <p className="block text-xs font-bold text-gray-700 mb-1">
                  Pinned Location <span className="text-red-500">*</span>
                </p>

                {pinnedLocation ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span className="text-xs text-green-700 font-semibold">
                        Selected: {pinnedLocation.lat.toFixed(5)},{" "}
                        {pinnedLocation.lng.toFixed(5)}
                      </span>
                    </div>
                    {/* Mini map preview */}
                    <div
                      className="rounded-lg overflow-hidden border border-gray-200"
                      style={{ height: 140 }}
                    >
                      <iframe
                        title="Pinned location preview"
                        width="100%"
                        height="140"
                        style={{ border: 0 }}
                        loading="lazy"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${pinnedLocation.lng - 0.005},${pinnedLocation.lat - 0.005},${pinnedLocation.lng + 0.005},${pinnedLocation.lat + 0.005}&layer=mapnik&marker=${pinnedLocation.lat},${pinnedLocation.lng}`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setMapOpen(true)}
                      className="w-full text-xs font-bold text-blue-600 border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-50 transition-colors"
                      data-ocid="cart.change_location.button"
                    >
                      Change Location
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      onClick={() => setMapOpen(true)}
                      className="w-full h-10 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 justify-center"
                      data-ocid="cart.pin_location.button"
                    >
                      <Navigation className="w-4 h-4" />
                      Pin Location on Map
                    </Button>
                    {formErrors.pin && (
                      <p
                        className="text-xs text-red-500"
                        data-ocid="cart.pin_error"
                      >
                        {formErrors.pin}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Zone Banner */}
          {zoneBanner()}

          {/* No store warning */}
          {!currentStoreId && (
            <div className="mb-3 flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
              <Store className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-semibold text-orange-700">
                No store selected — go back and shop from a store
              </span>
            </div>
          )}

          <Button
            onClick={handlePlaceOrder}
            disabled={createOrder.isPending || !canOrder}
            data-ocid="cart.submit_button"
            className={`w-full h-12 text-base font-extrabold bg-green-500 hover:bg-green-600 text-white rounded-xl shadow ${
              !canOrder ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {createOrder.isPending ? "Placing Order..." : "Place Order"}
          </Button>
        </>
      )}
    </div>
  );
}
