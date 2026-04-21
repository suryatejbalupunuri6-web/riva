import { Button } from "@/components/ui/button";
import { MapPin, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { isPointInPolygon } from "../utils/geofence";

// Leaflet loaded via CDN at runtime to avoid bundler dependency
declare global {
  interface Window {
    L: any;
  }
}

interface Props {
  open: boolean;
  initialLat?: number;
  initialLng?: number;
  onConfirm: (lat: number, lng: number) => void;
  onClose: () => void;
  deliveryZone?: { lat: number; lng: number }[];
}

const DEFAULT_LAT = 17.339;
const DEFAULT_LNG = 78.5583;
const DEFAULT_ZOOM = 15;

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

export default function MapPickerModal({
  open,
  initialLat,
  initialLng,
  onConfirm,
  onClose,
  deliveryZone,
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const zonePolygonRef = useRef<any>(null);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null,
  );
  const [leafletReady, setLeafletReady] = useState(!!window.L);
  const [pinInZone, setPinInZone] = useState<boolean | null>(null);

  // Load Leaflet on mount
  useEffect(() => {
    if (!leafletReady) {
      loadLeaflet().then(() => setLeafletReady(true));
    }
  }, [leafletReady]);

  // Update zone polygon color when pin changes
  useEffect(() => {
    if (!zonePolygonRef.current || pin === null) return;
    if (!deliveryZone) return;
    const inside = isPointInPolygon(pin.lat, pin.lng, deliveryZone);
    setPinInZone(inside);
    zonePolygonRef.current.setStyle({
      color: inside ? "#16a34a" : "#dc2626",
      fillColor: inside ? "#16a34a" : "#dc2626",
    });
  }, [pin, deliveryZone]);

  // Initialize map when modal opens and leaflet is ready
  useEffect(() => {
    if (!open) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        zonePolygonRef.current = null;
      }
      return;
    }
    if (!leafletReady) return;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current || mapRef.current) return;

      const L = window.L;
      const startLat = initialLat ?? DEFAULT_LAT;
      const startLng = initialLng ?? DEFAULT_LNG;

      const map = L.map(mapContainerRef.current, {
        center: [startLat, startLng],
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
        scrollWheelZoom: true,
        touchZoom: true,
        doubleClickZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "\u00a9 OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      // Draw delivery zone polygon if provided
      if (deliveryZone && deliveryZone.length >= 3) {
        const zonePolygon = L.polygon(
          deliveryZone.map((p) => [p.lat, p.lng]),
          { color: "#16a34a", weight: 2, fillOpacity: 0.08 },
        ).addTo(map);
        zonePolygonRef.current = zonePolygon;
        // Fit bounds to show full zone
        try {
          map.fitBounds(zonePolygon.getBounds(), { padding: [20, 20] });
        } catch {}
      }

      if (initialLat && initialLng) {
        const marker = L.marker([initialLat, initialLng], {
          draggable: true,
        }).addTo(map);
        markerRef.current = marker;
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          setPin({ lat: pos.lat, lng: pos.lng });
        });
      }

      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        const { lat, lng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.remove();
          markerRef.current = null;
        }
        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        markerRef.current = marker;
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          setPin({ lat: pos.lat, lng: pos.lng });
        });
        setPin({ lat, lng });
      });

      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 100);
    }, 50);

    return () => clearTimeout(timer);
  }, [open, initialLat, initialLng, leafletReady, deliveryZone]);

  useEffect(() => {
    if (open) {
      setPin(
        initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null,
      );
      setPinInZone(null);
    }
  }, [open, initialLat, initialLng]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)" }}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg flex flex-col"
        style={{ maxHeight: "92vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <MapPin className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h2 className="font-extrabold text-gray-900 text-sm">
                Pin Delivery Location
              </h2>
              <p className="text-xs text-gray-500">
                Tap anywhere on the map to drop a pin. Drag pin to adjust.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Zone hint */}
        {deliveryZone && (
          <div className="mx-4 mb-1 flex-shrink-0">
            {pin === null ? (
              <p className="text-[11px] text-gray-500 flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-sm border-2 border-green-500" />
                Green outline = delivery zone boundary
              </p>
            ) : pinInZone === true ? (
              <p className="text-[11px] font-semibold text-green-600">
                ✅ Inside delivery zone
              </p>
            ) : (
              <p className="text-[11px] font-semibold text-red-500">
                ❌ Outside delivery zone
              </p>
            )}
          </div>
        )}

        {/* Map Container */}
        <div
          className="mx-3 rounded-xl overflow-hidden flex-shrink-0"
          style={{
            height: "min(60vh, 420px)",
            minHeight: 300,
            position: "relative",
          }}
        >
          {!leafletReady ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <p className="text-sm text-gray-500">Loading map...</p>
            </div>
          ) : (
            <div
              ref={mapContainerRef}
              style={{ width: "100%", height: "100%" }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 flex-shrink-0 space-y-2">
          {pin ? (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-xs text-green-700 font-semibold">
                Pin at {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-500">
                No location pinned yet — tap the map
              </span>
            </div>
          )}
          <Button
            onClick={() => pin && onConfirm(pin.lat, pin.lng)}
            disabled={!pin}
            className="w-full h-11 font-extrabold bg-green-500 hover:bg-green-600 text-white rounded-xl disabled:opacity-40"
          >
            Confirm Location
          </Button>
        </div>
      </div>
    </div>
  );
}
