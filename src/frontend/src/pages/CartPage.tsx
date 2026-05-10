import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "@tanstack/react-router";
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
  const { currentUser, customerName } = useApp();
  const navigate = useNavigate();
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

  // Delivery option — only relevant when totalPrice < 100; default to "group"
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>("group");

  const [customer, setCustomer] = useState<CustomerDetails>(() => {
    try {
      const saved = localStorage.getItem("riva_customer");
      const parsed = saved ? JSON.parse(saved) : {};
      return {
        name: parsed.name || customerName || currentUser?.name || "",
        phone: parsed.phone || currentUser?.phone || "",
        address: parsed.address || "",
      };
    } catch {
      return {
        name: customerName || currentUser?.name || "",
        phone: currentUser?.phone || "",
        address: "",
      };
    }
  });

  const [formErrors, setFormErrors] = useState<
    Partial<CustomerDetails & { pin: string; delivery: string }>
  >({});

  // Delivery fee logic
  const deliveryFee = useMemo(() => {
    if (totalPrice >= 100) return 9;
    if (deliveryOption === "instant") return 15;
    if (deliveryOption === "group") return 5;
    return 5; // default group
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

  const canOrder =
    items.length > 0 &&
    zoneStatus === "in_range" &&
    currentStoreId !== null &&
    pinnedLocation !== null &&
    customer.name.trim() !== "" &&
    customer.phone.trim() !== "" &&
    customer.address.trim() !== "";

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
    else if (!/^\d{7,15}$/.test(customer.phone.trim()))
      errors.phone = "Enter a valid phone number (7–15 digits)";
    if (!customer.address.trim())
      errors.address = "Delivery address is required";
    if (!pinnedLocation)
      errors.pin = "Please pin your delivery location on the map";
    if (!currentStoreId)
      errors.pin = "No store selected — go back and shop from a store";
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
    if (items.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }
    if (!validateForm()) {
      toast.error("Please fill in all details and pin your location.");
      return;
    }
    if (!canOrder) {
      if (!currentStoreId) {
        toast.error("No store selected. Go back and shop from a store.");
      } else if (zoneStatus === "out_of_range") {
        toast.error("Your pinned location is outside the delivery zone.");
      }
      return;
    }

    const itemSummary = items.map((i) => `${i.name} ×${i.quantity}`).join(", ");
    const deliveryLabel =
      totalPrice >= 100
        ? "Standard Delivery (₹9)"
        : deliveryOption === "group"
          ? "Group Delivery (₹5)"
          : "Instant Delivery (₹15)";

    setConfirmModal({
      open: true,
      message: `Place order for: ${itemSummary}?\nTotal: ₹${finalTotal} (${deliveryLabel})`,
      action: async () => {
        try {
          localStorage.setItem("riva_customer", JSON.stringify(customer));

          // Build OrderItem array from cart items
          const orderItems = items.map((item) => ({
            productId: item.id,
            name: item.name,
            imageUrl: item.imageUrl ?? "",
            quantity: BigInt(item.quantity),
            price: item.price,
          }));

          const newOrderId = await createOrder.mutateAsync({
            storeId: currentStoreId!,
            items: orderItems,
            customerName: customer.name.trim(),
            customerPhone: customer.phone.trim(),
            address: customer.address.trim(),
            pinnedLatitude: pinnedLocation!.lat,
            pinnedLongitude: pinnedLocation!.lng,
            totalAmount: finalTotal,
            deliveryFee,
          });

          clearCart();
          toast.success("Order placed successfully! 🎉");
          const trackId = newOrderId.toString();
          navigate({
            to: "/customer/track/$orderId",
            params: { orderId: trackId },
          });
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
        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <MapPin className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-amber-700">
            Pin your delivery location to check availability
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-10">
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
          onClick={() => navigate({ to: "/customer/stores" })}
          className="text-sm font-semibold text-primary hover:underline"
        >
          ← Back
        </button>
        <h1 className="text-xl font-extrabold text-foreground flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-green-500" />
          Your Cart
        </h1>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ShoppingCart className="w-14 h-14 mx-auto mb-4 text-muted-foreground/30" />
          <p className="font-bold text-lg text-foreground">
            Your cart is empty
          </p>
          <p className="text-sm mt-1">Start shopping to add items here.</p>
          <button
            type="button"
            onClick={() => navigate({ to: "/customer" })}
            className="mt-5 px-6 py-3 rounded-xl font-bold text-sm text-white"
            style={{ backgroundColor: "#16a34a" }}
            data-ocid="cart.browse.button"
          >
            Start Shopping
          </button>
        </div>
      ) : (
        <>
          {/* Cart items */}
          <div className="space-y-3 mb-5">
            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  layout
                >
                  <Card className="border border-border shadow-sm">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        {/* Product image */}
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border border-border"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <ShoppingCart className="w-6 h-6 text-muted-foreground/40" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-foreground text-sm truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            ₹{item.price} each
                          </p>

                          <div className="flex items-center gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => decreaseQty(item.id)}
                              className="w-7 h-7 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center text-foreground font-bold transition-colors"
                              aria-label="Decrease quantity"
                              data-ocid={`cart.decrease.button.${item.id}`}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center font-extrabold text-foreground text-sm tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => increaseQty(item.id)}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold transition-colors"
                              style={{ backgroundColor: "#16a34a" }}
                              aria-label="Increase quantity"
                              data-ocid={`cart.increase.button.${item.id}`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <p className="font-extrabold text-foreground text-sm tabular-nums">
                            ₹{item.price * item.quantity}
                          </p>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="text-red-400 hover:text-red-600 transition-colors"
                            aria-label="Remove item"
                            data-ocid="cart.remove.button"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
              <p className="text-sm font-extrabold text-foreground mb-2">
                Choose Delivery Type
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleDeliverySelect("instant")}
                  data-ocid="cart.instant_delivery.toggle"
                  className={`flex flex-col items-center gap-1.5 border-2 rounded-xl p-4 transition-all ${
                    deliveryOption === "instant"
                      ? "border-green-500 bg-green-50"
                      : "border-border bg-card hover:border-green-300"
                  }`}
                >
                  <Zap
                    className={`w-6 h-6 ${deliveryOption === "instant" ? "text-green-600" : "text-muted-foreground"}`}
                  />
                  <span
                    className={`text-xs font-bold leading-tight text-center ${deliveryOption === "instant" ? "text-green-700" : "text-foreground"}`}
                  >
                    ⚡ Instant Delivery
                  </span>
                  <span
                    className={`text-base font-extrabold ${deliveryOption === "instant" ? "text-green-700" : "text-foreground"}`}
                  >
                    ₹15
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    10–15 mins
                  </span>
                  {deliveryOption === "instant" && (
                    <span className="text-[10px] font-semibold text-green-600 bg-green-100 rounded-full px-2 py-0.5">
                      Selected ✓
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDeliverySelect("group")}
                  data-ocid="cart.group_delivery.toggle"
                  className={`flex flex-col items-center gap-1.5 border-2 rounded-xl p-4 transition-all ${
                    deliveryOption === "group"
                      ? "border-green-500 bg-green-50"
                      : "border-border bg-card hover:border-green-300"
                  }`}
                >
                  <Users
                    className={`w-6 h-6 ${deliveryOption === "group" ? "text-green-600" : "text-muted-foreground"}`}
                  />
                  <span
                    className={`text-xs font-bold leading-tight text-center ${deliveryOption === "group" ? "text-green-700" : "text-foreground"}`}
                  >
                    👥 Group Delivery
                  </span>
                  <span
                    className={`text-base font-extrabold ${deliveryOption === "group" ? "text-green-700" : "text-foreground"}`}
                  >
                    ₹5
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    20–30 mins
                  </span>
                  <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5">
                    Most Affordable
                  </span>
                  {deliveryOption === "group" && (
                    <span className="text-[10px] font-semibold text-green-600 bg-green-100 rounded-full px-2 py-0.5">
                      Selected ✓
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
            <div className="mb-4">
              <p className="text-sm font-extrabold text-foreground mb-2">
                Delivery Type
              </p>
              <div className="flex items-center gap-3 border-2 border-green-500 bg-green-50 rounded-xl p-4">
                <Zap className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-green-700">
                    Standard Delivery
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
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
          <div className="bg-card border border-border rounded-xl px-4 py-3 mb-5 shadow-sm">
            <div className="flex items-center justify-between py-1.5">
              <span className="text-sm text-muted-foreground">Items Total</span>
              <span className="text-sm font-semibold text-foreground">
                ₹{totalPrice}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
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
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-yellow-500" />
                    Instant Delivery
                  </>
                )}
              </span>
              <span className="text-sm font-semibold text-foreground">
                ₹{deliveryFee}
              </span>
            </div>
            <div className="border-t border-border mt-1 pt-2 flex items-center justify-between">
              <span className="font-extrabold text-foreground">Total</span>
              <span className="font-extrabold text-green-700 text-lg">
                ₹{finalTotal}
              </span>
            </div>
          </div>

          {/* Customer Details Form */}
          <div className="mb-5 bg-card border border-border rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-extrabold text-foreground flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-green-500" />
              Delivery Details
            </h2>

            <div className="space-y-3">
              {/* Name */}
              <div>
                <label
                  htmlFor="customer-name"
                  className="block text-xs font-bold text-foreground mb-1"
                >
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="customer-name"
                  type="text"
                  placeholder="Enter your full name"
                  value={customer.name}
                  onChange={(e) => handleFieldChange("name", e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm text-foreground bg-background placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-400 ${
                    formErrors.name ? "border-red-400" : "border-input"
                  }`}
                  data-ocid="cart.name.input"
                />
                {formErrors.name && (
                  <p
                    className="text-xs text-red-500 mt-1"
                    data-ocid="cart.name_error.field_error"
                  >
                    {formErrors.name}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label
                  htmlFor="customer-phone"
                  className="block text-xs font-bold text-foreground mb-1"
                >
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  id="customer-phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="Enter phone number"
                  value={customer.phone}
                  onChange={(e) => handleFieldChange("phone", e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm text-foreground bg-background placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-400 ${
                    formErrors.phone ? "border-red-400" : "border-input"
                  }`}
                  data-ocid="cart.phone.input"
                />
                {formErrors.phone && (
                  <p
                    className="text-xs text-red-500 mt-1"
                    data-ocid="cart.phone_error.field_error"
                  >
                    {formErrors.phone}
                  </p>
                )}
              </div>

              {/* Address */}
              <div>
                <label
                  htmlFor="customer-address"
                  className="block text-xs font-bold text-foreground mb-1"
                >
                  Delivery Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="customer-address"
                  placeholder="Enter your full delivery address"
                  value={customer.address}
                  onChange={(e) => handleFieldChange("address", e.target.value)}
                  rows={3}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm text-foreground bg-background placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-400 resize-none ${
                    formErrors.address ? "border-red-400" : "border-input"
                  }`}
                  data-ocid="cart.address.textarea"
                />
                {formErrors.address && (
                  <p
                    className="text-xs text-red-500 mt-1"
                    data-ocid="cart.address_error.field_error"
                  >
                    {formErrors.address}
                  </p>
                )}
              </div>

              {/* Pin Location */}
              <div>
                <p className="block text-xs font-bold text-foreground mb-1">
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
                    {/* Mini map preview via OpenStreetMap iframe */}
                    <div
                      className="rounded-lg overflow-hidden border border-border"
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
                      className="w-full text-xs font-bold text-blue-600 border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-50 transition-colors bg-card"
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
                      className="w-full h-11 font-bold text-white rounded-lg flex items-center gap-2 justify-center"
                      style={{ backgroundColor: "#2563eb" }}
                      data-ocid="cart.pin_location.button"
                    >
                      <Navigation className="w-4 h-4" />
                      Pin Location on Map
                    </Button>
                    {formErrors.pin && (
                      <p
                        className="text-xs text-red-500"
                        data-ocid="cart.pin_error.field_error"
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

          {!canOrder && !createOrder.isPending && items.length > 0 && (
            <div className="mb-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <MapPin className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-amber-700">
                {!pinnedLocation
                  ? "Pin your location on the map to continue."
                  : zoneStatus === "out_of_range"
                    ? "Your location is outside the delivery zone."
                    : !customer.name.trim() ||
                        !customer.phone.trim() ||
                        !customer.address.trim()
                      ? "Please fill in all delivery details above."
                      : "Select a store to continue."}
              </p>
            </div>
          )}

          {/* Place Order Button */}
          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={createOrder.isPending || !canOrder}
            data-ocid="cart.submit_button"
            aria-disabled={!canOrder}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              backgroundColor:
                canOrder && !createOrder.isPending ? "#16a34a" : "#86efac",
              color: "#ffffff",
              fontWeight: "800",
              fontSize: "16px",
              border: "none",
              cursor:
                canOrder && !createOrder.isPending ? "pointer" : "not-allowed",
              boxShadow: canOrder ? "0 4px 12px rgba(22,163,74,0.35)" : "none",
              transition: "all 0.2s",
              touchAction: "manipulation",
            }}
          >
            {createOrder.isPending
              ? "Placing Order..."
              : `Place Order — ₹${finalTotal}`}
          </button>
        </>
      )}
    </div>
  );
}
