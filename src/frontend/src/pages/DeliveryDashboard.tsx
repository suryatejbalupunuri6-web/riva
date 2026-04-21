import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

function parseOrderData(itemName: string): ParsedOrderData {
  try {
    const parsed = JSON.parse(itemName);
    if (parsed && typeof parsed === "object" && "items" in parsed) {
      return {
        customerName: parsed.customerName || null,
        customerPhone: parsed.customerPhone || null,
        customerAddress: parsed.customerAddress || null,
        pinnedLatitude:
          parsed.pinnedLatitude != null ? Number(parsed.pinnedLatitude) : null,
        pinnedLongitude:
          parsed.pinnedLongitude != null
            ? Number(parsed.pinnedLongitude)
            : null,
        items: parsed.items || itemName,
      };
    }
  } catch {
    // not JSON
  }
  return {
    customerName: null,
    customerPhone: null,
    customerAddress: null,
    pinnedLatitude: null,
    pinnedLongitude: null,
    items: itemName,
  };
}

function CustomerInfo({ data }: { data: ParsedOrderData }) {
  const hasPinned = data.pinnedLatitude != null && data.pinnedLongitude != null;
  const mapsUrl = hasPinned
    ? `https://www.google.com/maps?q=${data.pinnedLatitude},${data.pinnedLongitude}`
    : null;
  const navigateUrl = hasPinned
    ? `https://www.google.com/maps/dir/?api=1&destination=${data.pinnedLatitude},${data.pinnedLongitude}`
    : null;

  if (
    !data.customerName &&
    !data.customerPhone &&
    !data.customerAddress &&
    !hasPinned
  )
    return null;

  return (
    <div className="mt-2 mb-3 space-y-2">
      {/* Customer Info */}
      <div className="bg-muted/60 rounded-lg px-3 py-2 space-y-1">
        {data.customerName && (
          <div className="flex items-center gap-1.5 text-xs text-foreground">
            <User className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <span className="font-medium">{data.customerName}</span>
          </div>
        )}
        {data.customerPhone && (
          <a
            href={`tel:${data.customerPhone}`}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
            data-ocid="delivery.call.link"
          >
            <Phone className="w-3 h-3 flex-shrink-0" />
            {data.customerPhone} · Call Customer
          </a>
        )}
        {data.customerAddress && (
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5 text-muted-foreground" />
            <span>{data.customerAddress}</span>
          </div>
        )}
      </div>

      {/* Pinned Location Section */}
      {hasPinned && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
            <MapPin className="w-3 h-3 text-green-600 flex-shrink-0" />
            <span className="text-xs text-green-700 font-semibold">
              Pinned: {data.pinnedLatitude!.toFixed(4)},{" "}
              {data.pinnedLongitude!.toFixed(4)}
            </span>
          </div>

          {/* Mini map iframe */}
          <div className="rounded-lg overflow-hidden border border-gray-200">
            <iframe
              title="Customer pinned location"
              width="100%"
              height="130"
              style={{ border: 0, display: "block" }}
              loading="lazy"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${data.pinnedLongitude! - 0.005},${data.pinnedLatitude! - 0.005},${data.pinnedLongitude! + 0.005},${data.pinnedLatitude! + 0.005}&layer=mapnik&marker=${data.pinnedLatitude},${data.pinnedLongitude}`}
            />
          </div>

          {/* Map action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <a
              href={mapsUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-2 transition-colors"
              data-ocid="delivery.view_pinned.button"
            >
              <MapPin className="w-3.5 h-3.5" />
              View Location
            </a>
            <a
              href={navigateUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg px-3 py-2 transition-colors"
              data-ocid="delivery.navigate.button"
            >
              <Navigation className="w-3.5 h-3.5" />
              Navigate
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DeliveryDashboard() {
  const { currentUser, navigate } = useApp();
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

  // Detect newly assigned orders
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

  // Cleanup all intervals on unmount
  useEffect(() => {
    return () => {
      for (const intervalId of gpsIntervalsRef.current.values()) {
        clearInterval(intervalId);
      }
    };
  }, []);

  // trackingOrders drives re-render so the "Live tracking active" badge updates
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
    localStorage.removeItem("deliveryAccess");
    navigate("landing");
  };

  const handleAcceptDelivery = (order: Order) => {
    const { items } = parseOrderData(order.itemName);
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
    const orderIdStr = order.id.toString();
    if (gpsIntervalsRef.current.has(orderIdStr)) return;

    // Use a ref-forwarded actor getter so the closure always has the latest actor
    const sendLocation = () => {
      // Re-read actor from DOM-captured ref at call time
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
            `TRACKING orderId (delivery send): ${orderIdStr}, lat: ${lat}, lng: ${lng}`,
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
    // Update state to trigger re-render (badge visibility)
    setTrackingOrders((prev) => new Set([...prev, orderIdStr]));
  };

  const handleStartDelivery = (order: Order) => {
    const { items } = parseOrderData(order.itemName);
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
    const { items } = parseOrderData(order.itemName);
    openConfirm(`Mark "${items}" as delivered?`, async () => {
      try {
        // Clear GPS tracking
        const orderIdStr = order.id.toString();
        const intervalId = gpsIntervalsRef.current.get(orderIdStr);
        if (intervalId !== undefined) {
          clearInterval(intervalId);
          gpsIntervalsRef.current.delete(orderIdStr);
        }
        // Update state so badge disappears
        setTrackingOrders((prev) => {
          const next = new Set(prev);
          next.delete(orderIdStr);
          return next;
        });
        try {
          if (
            actor &&
            typeof (actor as any).clearDeliveryLocation === "function"
          ) {
            (actor as any).clearDeliveryLocation(order.id).catch(() => {});
          }
        } catch {
          // function not available on this canister version, ignore
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
            className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
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
          <div className="space-y-3">
            {confirmedOrders.map((order, i) => {
              const parsed = parseOrderData(order.itemName);
              return (
                <motion.div
                  key={order.id.toString()}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  data-ocid={`delivery.available.item.${i + 1}`}
                >
                  <Card className="shadow-card border-border">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm text-foreground">
                            Items: {parsed.items}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Order #{order.id.toString()}
                          </p>
                          <Badge
                            variant="outline"
                            className="mt-1.5 text-xs bg-blue-50 text-blue-700 border-blue-200"
                          >
                            Store Confirmed
                          </Badge>
                        </div>
                      </div>
                      <CustomerInfo data={parsed} />
                      <Button
                        size="sm"
                        onClick={() => handleAcceptDelivery(order)}
                        disabled={updateStatus.isPending}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 text-xs"
                        data-ocid={`delivery.accept.button.${i + 1}`}
                      >
                        <Truck className="w-3.5 h-3.5" />
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

      {/* Assigned (heading to store) */}
      {assignedOrders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <Truck className="w-4 h-4 text-purple-600" />
            Assigned — Navigate to Store ({assignedOrders.length})
          </h2>
          <div className="space-y-3">
            {assignedOrders.map((order, i) => {
              const parsed = parseOrderData(order.itemName);
              return (
                <Card
                  key={order.id.toString()}
                  className="shadow-card border-purple-200"
                  data-ocid={`delivery.assigned.item.${i + 1}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Truck className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-foreground">
                          Items: {parsed.items}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Order #{order.id.toString()}
                        </p>
                      </div>
                    </div>
                    <CustomerInfo data={parsed} />
                    <Button
                      size="sm"
                      onClick={() => handleStartDelivery(order)}
                      disabled={updateStatus.isPending}
                      className="w-full bg-green-600 hover:bg-green-700 text-white gap-1.5 text-xs"
                      data-ocid={`delivery.pickup.button.${i + 1}`}
                    >
                      <Package className="w-3.5 h-3.5" />
                      Start Delivery
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Picked up - en route */}
      {pickedOrders.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <Package className="w-4 h-4 text-orange-600" />
            En Route — Deliver Now ({pickedOrders.length})
          </h2>
          <div className="space-y-3">
            {pickedOrders.map((order, i) => {
              const parsed = parseOrderData(order.itemName);
              const isTracking = trackingOrders.has(order.id.toString());
              return (
                <Card
                  key={order.id.toString()}
                  className="shadow-card border-orange-200"
                  data-ocid={`delivery.enroute.item.${i + 1}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-foreground">
                          Items: {parsed.items}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Order #{order.id.toString()}
                        </p>
                        {isTracking && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 rounded-full px-2 py-0.5 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Live tracking active
                          </span>
                        )}
                      </div>
                    </div>
                    <CustomerInfo data={parsed} />
                    <Button
                      size="sm"
                      onClick={() => handleMarkDelivered(order)}
                      disabled={updateStatus.isPending}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white gap-1.5 text-xs"
                      data-ocid={`delivery.delivered.button.${i + 1}`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
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
