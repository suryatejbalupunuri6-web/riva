import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  Loader2,
  LogOut,
  MapPin,
  Navigation,
  Package,
  Phone,
  RefreshCw,
  Truck,
  User,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { type Order, OrderStatus } from "../backend";
import ConfirmModal from "../components/ConfirmModal";
import { useApp } from "../context/AppContext";
import { useNotifications } from "../context/NotificationContext";
import { useActor } from "../hooks/useActor";
import { useOrdersByStatus, useUpdateOrderStatus } from "../hooks/useQueries";

interface ParsedOrderData {
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  pinnedLatitude: number | null;
  pinnedLongitude: number | null;
  items: string;
}

/** Extract customer fields from the new Order type */
function parseOrderData(order: Order): ParsedOrderData {
  const itemsStr =
    Array.isArray(order.items) && order.items.length > 0
      ? order.items.map((item) => `${item.name} ×${item.quantity}`).join(", ")
      : "—";

  return {
    customerName: order.customerName || null,
    customerPhone: order.customerPhone || null,
    customerAddress: order.address || null,
    pinnedLatitude: order.pinnedLatitude ?? null,
    pinnedLongitude: order.pinnedLongitude ?? null,
    items: itemsStr,
  };
}

function navigateToCustomer(data: ParsedOrderData) {
  const hasPinned = data.pinnedLatitude != null && data.pinnedLongitude != null;
  if (hasPinned) {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${data.pinnedLatitude},${data.pinnedLongitude}`,
      "_blank",
      "noopener,noreferrer",
    );
  } else if (data.customerAddress) {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.customerAddress)}`,
      "_blank",
      "noopener,noreferrer",
    );
  } else {
    toast.error("No customer location available");
  }
}

function CustomerInfoCard({
  data,
  order,
}: {
  data: ParsedOrderData;
  order: Order;
}) {
  const hasPinned = data.pinnedLatitude != null && data.pinnedLongitude != null;

  return (
    <div className="mt-3 mb-3 space-y-3">
      {/* Customer details */}
      <div className="bg-muted/60 rounded-xl px-4 py-3 space-y-2.5 border border-border">
        {/* Name */}
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Customer Name
            </p>
            <p className="text-sm font-bold text-foreground">
              {data.customerName || "—"}
            </p>
          </div>
        </div>

        {/* Phone */}
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Phone Number
            </p>
            {data.customerPhone ? (
              <a
                href={`tel:${data.customerPhone}`}
                className="text-sm font-bold text-blue-600 hover:text-blue-700 underline underline-offset-2"
                data-ocid="delivery.call.link"
              >
                {data.customerPhone} · Tap to Call
              </a>
            ) : (
              <p className="text-sm font-semibold text-foreground">—</p>
            )}
          </div>
        </div>

        {/* Address */}
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Full Address
            </p>
            <p className="text-sm font-medium text-foreground break-words leading-snug">
              {data.customerAddress || "—"}
            </p>
          </div>
        </div>

        {/* Order Items */}
        <div className="flex items-start gap-2">
          <Package className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Order Items
            </p>
            <p className="text-sm font-medium text-foreground break-words leading-snug">
              {data.items}
            </p>
          </div>
        </div>

        {/* Total Amount */}
        {order.totalAmount > 0 && (
          <div className="flex items-center gap-2 border-t border-border pt-2">
            <div className="w-4 h-4 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Total Amount
              </p>
              <p className="text-base font-extrabold text-primary">
                ₹{order.totalAmount}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Pinned location indicator */}
      {hasPinned && (
        <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-lg px-3 py-2">
          <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <span className="text-xs font-semibold text-primary">
            GPS Pin: {data.pinnedLatitude!.toFixed(4)},{" "}
            {data.pinnedLongitude!.toFixed(4)}
          </span>
        </div>
      )}

      {/* Mini map preview */}
      {hasPinned && (
        <div className="rounded-lg overflow-hidden border border-border">
          <iframe
            title="Customer pinned location"
            width="100%"
            height="130"
            style={{ border: 0, display: "block" }}
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${data.pinnedLongitude! - 0.005},${data.pinnedLatitude! - 0.005},${data.pinnedLongitude! + 0.005},${data.pinnedLatitude! + 0.005}&layer=mapnik&marker=${data.pinnedLatitude},${data.pinnedLongitude}`}
          />
        </div>
      )}

      {/* Navigate Button — large, prominent, solid green */}
      <button
        type="button"
        onClick={() => navigateToCustomer(data)}
        style={{ backgroundColor: "#16a34a" }}
        className="w-full flex items-center justify-center gap-2.5 text-white font-extrabold text-sm rounded-xl py-3.5 px-4 shadow-md hover:opacity-90 active:opacity-80 transition-opacity"
        data-ocid="delivery.navigate.button"
        aria-label="Navigate to customer location in Google Maps"
      >
        <Navigation className="w-5 h-5" />
        🗺️ Navigate to Customer
      </button>
    </div>
  );
}

export default function DeliveryDashboard() {
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const { actor } = useActor();
  const { addNotification } = useNotifications();
  const prevAssignedCount = useRef(-1);
  const gpsIntervalsRef = useRef<Map<string, number>>(new Map());

  const {
    data: confirmedOrders = [],
    isLoading: loadingConfirmed,
    refetch,
  } = useOrdersByStatus(OrderStatus.storeConfirmed);
  const { data: assignedOrders = [] } = useOrdersByStatus(
    OrderStatus.riderAssigned,
  );
  const { data: pickedOrders = [] } = useOrdersByStatus(OrderStatus.pickedUp);
  const updateStatus = useUpdateOrderStatus();

  // Detect newly confirmed orders and notify
  useEffect(() => {
    const count = confirmedOrders.length;
    if (prevAssignedCount.current === -1) {
      prevAssignedCount.current = count;
      return;
    }
    if (count > prevAssignedCount.current) {
      addNotification({
        title: "Riva: New Delivery Assigned 🚚",
        message: "A new delivery has been assigned to you. Check the details.",
        type: "order",
      });
    }
    prevAssignedCount.current = count;
  }, [confirmedOrders.length, addNotification]);

  // Cleanup all GPS intervals on unmount
  useEffect(() => {
    return () => {
      for (const intervalId of gpsIntervalsRef.current.values()) {
        clearInterval(intervalId);
      }
    };
  }, []);

  const [trackingOrders, setTrackingOrders] = useState<Set<string>>(new Set());

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    message: string;
    action: (() => void) | null;
  }>({ open: false, message: "", action: null });

  const openConfirm = (message: string, action: () => void) => {
    setConfirmModal({ open: true, message, action });
  };

  const handleConfirm = () => {
    confirmModal.action?.();
    setConfirmModal({ open: false, message: "", action: null });
  };

  const handleCancel = () => {
    setConfirmModal({ open: false, message: "", action: null });
  };

  const handleLogout = () => {
    localStorage.removeItem("riva_delivery_access");
    navigate({ to: "/" });
  };

  const handleAcceptDelivery = (order: Order) => {
    const { items } = parseOrderData(order);
    openConfirm(`Accept delivery for "${items}"?`, async () => {
      try {
        await updateStatus.mutateAsync({
          orderId: order.id,
          status: OrderStatus.riderAssigned,
        });
        toast.success("Delivery accepted!");
      } catch (e: unknown) {
        toast.error((e as Error)?.message || "Failed.");
      }
    });
  };

  const startGpsTracking = (order: Order) => {
    const orderIdStr = order.id;
    if (gpsIntervalsRef.current.has(orderIdStr)) return;

    const sendLocation = () => {
      const currentActor = actor;
      if (!currentActor) {
        console.warn("TRACKING: actor not ready, skipping location update");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          console.log(
            `TRACKING orderId: ${orderIdStr}, lat: ${lat}, lng: ${lng}`,
          );
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (currentActor as any)
            .updateDeliveryLocation(order.id, lat, lng)
            .then(() => {
              console.log(`TRACKING: location saved for order ${orderIdStr}`);
            })
            .catch((err: unknown) => {
              console.error("TRACKING: updateDeliveryLocation failed:", err);
            });
        },
        (err) => {
          console.warn("TRACKING: GPS error:", err.message);
        },
        { enableHighAccuracy: true, timeout: 5000 },
      );
    };

    sendLocation();
    const intervalId = window.setInterval(sendLocation, 3000);
    gpsIntervalsRef.current.set(orderIdStr, intervalId);
    setTrackingOrders((prev) => new Set([...prev, orderIdStr]));
  };

  const handleStartDelivery = (order: Order) => {
    const { items } = parseOrderData(order);
    openConfirm(
      `Start delivery for "${items}"? This will share your live location with the customer.`,
      async () => {
        try {
          await updateStatus.mutateAsync({
            orderId: order.id,
            status: OrderStatus.pickedUp,
          });
          toast.success("Delivery started! Live tracking active 🛵");
          startGpsTracking(order);
        } catch (e: unknown) {
          toast.error((e as Error)?.message || "Failed.");
        }
      },
    );
  };

  const handleMarkDelivered = (order: Order) => {
    const { items } = parseOrderData(order);
    openConfirm(`Mark "${items}" as delivered?`, async () => {
      try {
        const orderIdStr = order.id;
        const intervalId = gpsIntervalsRef.current.get(orderIdStr);
        if (intervalId !== undefined) {
          clearInterval(intervalId);
          gpsIntervalsRef.current.delete(orderIdStr);
        }
        setTrackingOrders((prev) => {
          const next = new Set(prev);
          next.delete(orderIdStr);
          return next;
        });
        try {
          if (
            actor &&
            typeof (actor as unknown as Record<string, unknown>)
              .clearDeliveryLocation === "function"
          ) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (actor as any).clearDeliveryLocation(order.id).catch(() => {});
          }
        } catch {
          // function not available, ignore
        }

        await updateStatus.mutateAsync({
          orderId: order.id,
          status: OrderStatus.delivered,
        });
        toast.success("Order delivered! Great job 🎉");
      } catch (e: unknown) {
        toast.error((e as Error)?.message || "Failed.");
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <ConfirmModal
        open={confirmModal.open}
        message={confirmModal.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Delivery Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            {currentUser?.name || "Delivery Partner"} · Find and deliver orders
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5"
            data-ocid="delivery.refresh.button"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
            data-ocid="delivery.logout.button"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </Button>
        </div>
      </div>

      {/* Available to Accept */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          Available Deliveries ({confirmedOrders.length})
        </h2>
        {loadingConfirmed ? (
          <div
            className="flex items-center gap-2 text-muted-foreground text-sm py-4"
            data-ocid="delivery.available.loading_state"
          >
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : confirmedOrders.length === 0 ? (
          <div
            className="text-center py-8 text-muted-foreground text-sm bg-muted/50 rounded-xl"
            data-ocid="delivery.available.empty_state"
          >
            No deliveries available right now.
          </div>
        ) : (
          <div className="space-y-4">
            {confirmedOrders.map((order, i) => {
              const parsed = parseOrderData(order);
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  data-ocid={`delivery.available.item.${i + 1}`}
                >
                  <Card className="shadow-sm border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">
                            Order #{order.id}
                          </p>
                          <Badge
                            variant="outline"
                            className="mt-1 text-xs bg-blue-50 text-blue-700 border-blue-200"
                          >
                            Store Confirmed
                          </Badge>
                        </div>
                      </div>
                      <CustomerInfoCard data={parsed} order={order} />
                      <Button
                        size="sm"
                        onClick={() => handleAcceptDelivery(order)}
                        disabled={updateStatus.isPending}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 text-sm font-bold mt-1"
                        data-ocid={`delivery.accept.button.${i + 1}`}
                      >
                        <Truck className="w-4 h-4" />
                        Accept Delivery
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assigned — heading to store */}
      {assignedOrders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <Truck className="w-4 h-4 text-purple-600" />
            Assigned — Navigate to Store ({assignedOrders.length})
          </h2>
          <div className="space-y-4">
            {assignedOrders.map((order, i) => {
              const parsed = parseOrderData(order);
              return (
                <Card
                  key={order.id}
                  className="shadow-sm border-border"
                  data-ocid={`delivery.assigned.item.${i + 1}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Truck className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">
                          Order #{order.id}
                        </p>
                        <Badge
                          variant="outline"
                          className="mt-1 text-xs bg-purple-50 text-purple-700 border-purple-200"
                        >
                          Rider Assigned
                        </Badge>
                      </div>
                    </div>
                    <CustomerInfoCard data={parsed} order={order} />
                    <Button
                      size="sm"
                      onClick={() => handleStartDelivery(order)}
                      disabled={updateStatus.isPending}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white gap-1.5 text-sm font-bold mt-1"
                      data-ocid={`delivery.pickup.button.${i + 1}`}
                    >
                      <Package className="w-4 h-4" />
                      Start Delivery
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Picked up — en route */}
      {pickedOrders.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <Package className="w-4 h-4 text-orange-600" />
            En Route — Deliver Now ({pickedOrders.length})
          </h2>
          <div className="space-y-4">
            {pickedOrders.map((order, i) => {
              const parsed = parseOrderData(order);
              const isTracking = trackingOrders.has(order.id);
              return (
                <Card
                  key={order.id}
                  className="shadow-sm border-border"
                  data-ocid={`delivery.enroute.item.${i + 1}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">
                          Order #{order.id}
                        </p>
                        {isTracking && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 rounded-full px-2 py-0.5 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            Live tracking active
                          </span>
                        )}
                      </div>
                    </div>
                    <CustomerInfoCard data={parsed} order={order} />
                    <Button
                      size="sm"
                      onClick={() => handleMarkDelivered(order)}
                      disabled={updateStatus.isPending}
                      style={{ backgroundColor: "#16a34a" }}
                      className="w-full text-white gap-1.5 text-sm font-bold mt-1 hover:opacity-90"
                      data-ocid={`delivery.delivered.button.${i + 1}`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Mark as Delivered
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
