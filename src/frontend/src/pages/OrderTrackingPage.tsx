import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  Navigation,
  Package,
  ShoppingBag,
  Timer,
  Truck,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  type MutableRefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { OrderStatus } from "../backend";
import { useApp } from "../context/AppContext";
import { useCart } from "../context/CartContext";
import { useNotifications } from "../context/NotificationContext";
import { formatCountdown, useOrderCountdown } from "../hooks/useOrderCountdown";
import {
  useDeliveryLocation,
  useMyOrders,
  useStoreById,
} from "../hooks/useQueries";

// Leaflet loaded via CDN
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    L: any;
  }
}

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

function loadLeaflet(): Promise<void> {
  return new Promise((resolve) => {
    if (window.L) {
      resolve();
      return;
    }
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    if (!document.querySelector(`script[src="${LEAFLET_JS}"]`)) {
      const script = document.createElement("script");
      script.src = LEAFLET_JS;
      script.onload = () => resolve();
      document.head.appendChild(script);
    } else {
      resolve();
    }
  });
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function animateMarkerTo(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  marker: any,
  animFrameRef: MutableRefObject<number | null>,
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  durationMs: number,
) {
  if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
  const start = performance.now();
  const tick = (now: number) => {
    const elapsed = now - start;
    const t = Math.min(elapsed / durationMs, 1);
    const ease = 1 - (1 - t) ** 3;
    marker.setLatLng([
      fromLat + (toLat - fromLat) * ease,
      fromLng + (toLng - fromLng) * ease,
    ]);
    if (t < 1) {
      animFrameRef.current = requestAnimationFrame(tick);
    } else {
      animFrameRef.current = null;
    }
  };
  animFrameRef.current = requestAnimationFrame(tick);
}

const STATUS_STEPS = [
  {
    key: OrderStatus.requested,
    label: "Placed",
    icon: ShoppingBag,
    emoji: "🛍️",
  },
  {
    key: OrderStatus.storeConfirmed,
    label: "Confirmed",
    icon: CheckCircle2,
    emoji: "✅",
  },
  {
    key: OrderStatus.riderAssigned,
    label: "Rider Assigned",
    icon: Truck,
    emoji: "🚴",
  },
  {
    key: OrderStatus.pickedUp,
    label: "On the Way",
    icon: Package,
    emoji: "📦",
  },
  {
    key: OrderStatus.delivered,
    label: "Delivered",
    icon: CheckCircle2,
    emoji: "🎉",
  },
] as const;

type StatusKey = (typeof STATUS_STEPS)[number]["key"];

function getStepIndex(status: StatusKey | string): number {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

function OrderStatusTracker({ status }: { status: string }) {
  const activeIdx = getStepIndex(status);

  return (
    <div
      className="mx-4 mt-4 bg-card border border-border rounded-2xl p-4"
      data-ocid="tracking.status_steps.panel"
    >
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-4">
        Order Progress
      </p>
      <div className="flex items-start justify-between gap-1">
        {STATUS_STEPS.map((step, idx) => {
          const isPast = idx < activeIdx;
          const isActive = idx === activeIdx;
          const Icon = step.icon;

          return (
            <div
              key={step.key}
              className="flex flex-col items-center gap-2 flex-1 min-w-0 relative"
            >
              {/* Connector line */}
              {idx < STATUS_STEPS.length - 1 && (
                <div
                  className="absolute left-[calc(50%+20px)] right-[calc(-50%+20px)] top-5 h-0.5 z-0"
                  style={{
                    background: isPast || isActive ? "#16a34a" : "#e5e7eb",
                  }}
                />
              )}

              {/* Icon circle — 36–40px */}
              <div
                className={`relative z-10 flex items-center justify-center rounded-full flex-shrink-0 transition-all duration-300 ${
                  isActive
                    ? "w-10 h-10 bg-green-600 shadow-lg ring-2 ring-green-300"
                    : isPast
                      ? "w-9 h-9 bg-green-100"
                      : "w-9 h-9 bg-muted border-2 border-border"
                }`}
                aria-label={step.label}
              >
                {isActive ? (
                  <Icon className="w-5 h-5 text-white" />
                ) : isPast ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <Icon className="w-4 h-4 text-muted-foreground/40" />
                )}
                {isActive && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] text-center leading-tight font-medium w-full px-0.5 ${
                  isActive
                    ? "font-bold text-green-700"
                    : isPast
                      ? "text-green-600"
                      : "text-muted-foreground/40"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UpdatingLocationPill() {
  return (
    <div
      className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3"
      data-ocid="tracking.waiting.panel"
    >
      <span className="relative flex h-3 w-3 flex-shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
      </span>
      <p className="text-sm font-semibold text-amber-800 animate-pulse">
        Updating location...
      </p>
    </div>
  );
}

export default function OrderTrackingPage() {
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const { orderId: trackingOrderId } = useParams({
    from: "/customer/track/$orderId",
  });
  const { addNotification } = useNotifications();
  const { addItem } = useCart();
  const customerId = currentUser?.id?.toString();

  const { data: orders = [] } = useMyOrders(customerId);

  // trackingOrderId is string | null; Order.id is string — direct comparison works
  const order = useMemo(
    () =>
      orders.find(
        (o) => trackingOrderId !== null && o.id === trackingOrderId,
      ) ?? null,
    [orders, trackingOrderId],
  );

  // Use string orderId for delivery location
  const { data: deliveryLocation } = useDeliveryLocation(order?.id ?? null);
  const { data: store } = useStoreById(order?.storeId ?? null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const riderMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storeMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customerMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polylineRef = useRef<any>(null);
  const prevRiderPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [leafletReady, setLeafletReady] = useState(!!window.L);
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState<number | null>(
    null,
  );

  const isPending = order?.status === OrderStatus.requested;
  const orderId = order?.id ?? null;

  const { secondsLeft } = useOrderCountdown(isPending ? orderId : null);

  // Backend #expired is the authoritative source — never rely solely on client timer
  const isBackendExpired = order?.status === OrderStatus.expired;

  // Fire expiry notification once (only when backend confirms expiry)
  const expiredNotifFired = useRef(false);
  useEffect(() => {
    if (isBackendExpired && !expiredNotifFired.current) {
      expiredNotifFired.current = true;
      addNotification({
        title: "Riva: Order Expired",
        message:
          "Riva: Your order expired. No vendor accepted in time. Try again.",
        type: "order",
      });
    }
  }, [isBackendExpired, addNotification]);

  useEffect(() => {
    if (!leafletReady) loadLeaflet().then(() => setLeafletReady(true));
  }, [leafletReady]);

  // Track seconds since last location update
  useEffect(() => {
    if (!deliveryLocation) {
      setSecondsSinceUpdate(null);
      return;
    }
    const compute = () => {
      const updatedAtMs = Number(deliveryLocation.updatedAt) / 1_000_000;
      setSecondsSinceUpdate(Math.floor((Date.now() - updatedAtMs) / 1000));
    };
    compute();
    const timer = setInterval(compute, 1000);
    return () => clearInterval(timer);
  }, [deliveryLocation]);

  // Initialize map
  useEffect(() => {
    if (!leafletReady) return;
    if (mapRef.current) return;
    const el = document.getElementById("tracking-map");
    if (!el) return;
    const L = window.L;
    const map = L.map(el, { zoomControl: true }).setView([17.338, 78.553], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    mapRef.current = map;
    return () => {
      if (animFrameRef.current !== null)
        cancelAnimationFrame(animFrameRef.current);
      map.remove();
      mapRef.current = null;
      riderMarkerRef.current = null;
      storeMarkerRef.current = null;
      customerMarkerRef.current = null;
      polylineRef.current = null;
      prevRiderPosRef.current = null;
    };
  }, [leafletReady]);

  // Place store & customer markers
  useEffect(() => {
    if (!mapRef.current || !leafletReady) return;
    const L = window.L;
    if (order?.pinnedLatitude && order?.pinnedLongitude) {
      const icon = L.divIcon({ html: "📍", className: "", iconSize: [28, 28] });
      if (!customerMarkerRef.current) {
        customerMarkerRef.current = L.marker(
          [order.pinnedLatitude, order.pinnedLongitude],
          { icon },
        )
          .addTo(mapRef.current)
          .bindPopup("Your location");
      } else {
        customerMarkerRef.current.setLatLng([
          order.pinnedLatitude,
          order.pinnedLongitude,
        ]);
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storeLat = (store as any)?.latitude ?? 17.338;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storeLng = (store as any)?.longitude ?? 78.553;
    const storeIcon = L.divIcon({
      html: "🏪",
      className: "",
      iconSize: [28, 28],
    });
    if (!storeMarkerRef.current) {
      storeMarkerRef.current = L.marker([storeLat, storeLng], {
        icon: storeIcon,
      })
        .addTo(mapRef.current)
        .bindPopup(store?.name ?? "Store");
    } else {
      storeMarkerRef.current.setLatLng([storeLat, storeLng]);
    }
  }, [order, store, leafletReady]);

  // Update rider marker
  useEffect(() => {
    if (!mapRef.current || !deliveryLocation || !leafletReady) return;
    const L = window.L;
    const riderLat = deliveryLocation.lat;
    const riderLng = deliveryLocation.lng;
    const riderIcon = L.divIcon({
      html: "🛵",
      className: "",
      iconSize: [28, 28],
    });

    if (!riderMarkerRef.current) {
      riderMarkerRef.current = L.marker([riderLat, riderLng], {
        icon: riderIcon,
      })
        .addTo(mapRef.current)
        .bindPopup("Rider");
      prevRiderPosRef.current = { lat: riderLat, lng: riderLng };
    } else {
      const prev = prevRiderPosRef.current;
      if (
        prev &&
        (Math.abs(prev.lat - riderLat) > 0.000001 ||
          Math.abs(prev.lng - riderLng) > 0.000001)
      ) {
        animateMarkerTo(
          riderMarkerRef.current,
          animFrameRef,
          prev.lat,
          prev.lng,
          riderLat,
          riderLng,
          1000,
        );
      } else {
        riderMarkerRef.current.setLatLng([riderLat, riderLng]);
      }
      prevRiderPosRef.current = { lat: riderLat, lng: riderLng };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storeLat = (store as any)?.latitude ?? 17.338;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storeLng = (store as any)?.longitude ?? 78.553;
    const customerLat = order?.pinnedLatitude ?? 17.338;
    const customerLng = order?.pinnedLongitude ?? 78.553;
    const points: [number, number][] = [
      [storeLat, storeLng],
      [riderLat, riderLng],
      [customerLat, customerLng],
    ];
    if (polylineRef.current) polylineRef.current.remove();
    polylineRef.current = L.polyline(points, {
      color: "#f97316",
      weight: 3,
      dashArray: "8,8",
    }).addTo(mapRef.current);

    mapRef.current.panTo([riderLat, riderLng], {
      animate: true,
      duration: 0.8,
    });
  }, [deliveryLocation, order, store, leafletReady]);

  const etaMinutes = useMemo(() => {
    if (!deliveryLocation || !order?.pinnedLatitude || !order?.pinnedLongitude)
      return null;
    const dist = haversineKm(
      deliveryLocation.lat,
      deliveryLocation.lng,
      order.pinnedLatitude,
      order.pinnedLongitude,
    );
    return Math.max(1, Math.round((dist / 20) * 60));
  }, [deliveryLocation, order]);

  const isDelivered = order?.status === OrderStatus.delivered;
  const isStale = secondsSinceUpdate !== null && secondsSinceUpdate > 8;
  const showUpdatingIndicator =
    deliveryLocation !== null && deliveryLocation !== undefined && isStale;
  const waitingForRider =
    !deliveryLocation && !isDelivered && !isBackendExpired;
  const showMap = !isBackendExpired;

  const statusColor: Record<string, string> = {
    [OrderStatus.requested]: "bg-amber-100 text-amber-700 border-amber-300",
    [OrderStatus.storeConfirmed]: "bg-blue-100 text-blue-700 border-blue-300",
    [OrderStatus.riderAssigned]:
      "bg-purple-100 text-purple-700 border-purple-300",
    [OrderStatus.pickedUp]: "bg-orange-100 text-orange-700 border-orange-300",
    [OrderStatus.delivered]: "bg-green-100 text-green-700 border-green-300",
    [OrderStatus.expired]: "bg-red-100 text-red-700 border-red-300",
  };

  return (
    <div
      className="max-w-2xl mx-auto flex flex-col"
      style={{ minHeight: "calc(100vh - 120px)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background sticky top-0 z-20">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/customer" })}
          className="gap-1.5 -ml-2"
          data-ocid="tracking.back.button"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-foreground">Live Tracking</h1>
          {order && (
            <p className="text-xs text-muted-foreground truncate">
              Order #{order.id}
            </p>
          )}
        </div>
        {order && (
          <Badge
            className={`text-xs border ${statusColor[order.status as string] ?? "bg-muted text-muted-foreground"}`}
            variant="outline"
          >
            {order.status}
          </Badge>
        )}
        {secondsSinceUpdate !== null && (
          <div
            className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full"
            data-ocid="tracking.last_updated.panel"
          >
            <Clock className="w-3 h-3" />
            {secondsSinceUpdate}s
          </div>
        )}
      </div>

      {/* Status progress tracker */}
      {order && !isBackendExpired && (
        <OrderStatusTracker status={order.status as string} />
      )}

      {/* Countdown pill for pending orders — vendor acceptance stage */}
      <AnimatePresence>
        {isPending && !isBackendExpired && (
          <motion.div
            key="pending-acceptance"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mx-4 mt-4"
          >
            <div
              className="bg-amber-50 border border-amber-300 rounded-2xl px-4 py-4"
              data-ocid="tracking.pending_acceptance.panel"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="relative flex h-3 w-3 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                </span>
                <p className="text-sm font-bold text-amber-800">
                  Waiting for a vendor to accept your order...
                </p>
              </div>
              <p className="text-xs text-amber-600 mb-3">
                Vendors have 5 minutes to accept. If no one accepts, your order
                will expire and you can reorder.
              </p>
              <div className="flex items-center justify-center gap-2 bg-white/70 border border-amber-200 rounded-full px-4 py-2">
                <Timer className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="text-sm font-bold text-amber-700">
                  Expires in{" "}
                  <span
                    className={`font-mono tabular-nums ${
                      secondsLeft > 120
                        ? "text-green-700"
                        : secondsLeft > 60
                          ? "text-yellow-600"
                          : "text-red-600"
                    }`}
                  >
                    {formatCountdown(secondsLeft)}
                  </span>{" "}
                  remaining
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expired state */}
      <AnimatePresence>
        {isBackendExpired && (
          <motion.div
            key="expired"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-4 mt-4 p-6 bg-red-50 border border-red-200 rounded-2xl text-center"
            data-ocid="tracking.expired.error_state"
          >
            <p className="text-4xl mb-3">❌</p>
            <p className="font-bold text-red-800 text-base">
              No vendor accepted your order.
            </p>
            <p className="text-sm text-red-600 mt-1 mb-4">
              Please try ordering again.
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                size="sm"
                onClick={() => {
                  if (order?.items) {
                    for (const item of order.items) {
                      addItem(
                        {
                          id: item.productId,
                          name: item.name,
                          price: item.price,
                        },
                        order.storeId,
                      );
                    }
                  }
                  navigate({ to: "/customer/cart" });
                }}
                className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                data-ocid="tracking.reorder.button"
              >
                🔄 Reorder
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate({ to: "/customer" })}
                className="border-red-200 text-red-700 hover:bg-red-50"
                data-ocid="tracking.back_home.button"
              >
                Back to Dashboard
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delivered banner */}
      {isDelivered && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-4 p-5 bg-green-50 border border-green-200 rounded-2xl text-center"
          data-ocid="tracking.delivered.success_state"
        >
          <p className="text-3xl mb-2">🎉</p>
          <p className="font-bold text-green-800 text-lg">Order Delivered!</p>
          <p className="text-sm text-green-600 mt-1">
            ✓ Delivered! Thank you for ordering with Riva
          </p>
          <Button
            size="sm"
            onClick={() => navigate({ to: "/customer" })}
            className="mt-4 bg-green-600 hover:bg-green-700 text-white"
            data-ocid="tracking.back_home.button"
          >
            Back to Dashboard
          </Button>
        </motion.div>
      )}

      {/* Status banner (active orders) — only for non-pending, non-expired states */}
      {!isDelivered && !isBackendExpired && !isPending && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-4"
        >
          {showUpdatingIndicator ? (
            <UpdatingLocationPill />
          ) : waitingForRider ? (
            <div
              className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3"
              data-ocid="tracking.waiting.panel"
            >
              <span className="text-2xl">📦</span>
              <div>
                <p className="text-sm font-bold text-amber-800">
                  Waiting for rider...
                </p>
                <p className="text-xs text-amber-600">
                  Rider will start sharing location soon
                </p>
              </div>
            </div>
          ) : (
            <div
              className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 space-y-1"
              data-ocid="tracking.status.panel"
            >
              <p className="text-sm font-bold text-orange-800">
                🚴 Out for delivery
              </p>
              {etaMinutes !== null && (
                <p className="text-xs font-semibold text-orange-700 flex items-center gap-1">
                  <Navigation className="w-3 h-3" />~{etaMinutes} min
                  {etaMinutes !== 1 ? "s" : ""} away
                </p>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Map */}
      {showMap && (
        <>
          <div className="mx-4 mt-4 rounded-xl overflow-hidden border border-border shadow-sm">
            {!leafletReady ? (
              <div
                className="w-full flex items-center justify-center bg-muted"
                style={{ height: 320 }}
              >
                <p className="text-sm text-muted-foreground">Loading map...</p>
              </div>
            ) : (
              <div id="tracking-map" style={{ width: "100%", height: 320 }} />
            )}
          </div>

          <div className="mx-4 mt-2 mb-4 flex items-center justify-center gap-5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-green-600" />🏪 Store
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-blue-600" />📍 You
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-orange-500" />🛵 Rider
            </span>
          </div>
        </>
      )}

      {/* Order details */}
      {order && (
        <div className="mx-4 mb-6 bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
            Order Details
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className="text-xs bg-muted text-muted-foreground"
            >
              #{order.id}
            </Badge>
            <span className="text-sm text-foreground font-medium">
              ₹{order.totalAmount}
            </span>
          </div>
          {order.customerName && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Name:</span>{" "}
                <span className="font-semibold text-foreground">
                  {order.customerName}
                </span>
              </div>
              {order.customerPhone && (
                <div>
                  <span className="text-muted-foreground">Phone:</span>{" "}
                  <a
                    href={`tel:${order.customerPhone}`}
                    className="font-semibold text-primary"
                  >
                    {order.customerPhone}
                  </a>
                </div>
              )}
            </div>
          )}
          {order.address && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Address:</span>{" "}
              {order.address}
            </p>
          )}
          {order.pinnedLatitude && order.pinnedLongitude && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${order.pinnedLatitude},${order.pinnedLongitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold hover:underline"
              data-ocid="tracking.navigate.link"
            >
              <Navigation className="w-3 h-3" />
              View on Google Maps
            </a>
          )}
        </div>
      )}
    </div>
  );
}
