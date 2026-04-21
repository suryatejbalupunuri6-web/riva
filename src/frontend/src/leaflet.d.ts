declare module "leaflet" {
  interface LatLng {
    lat: number;
    lng: number;
  }
  interface LeafletMouseEvent {
    latlng: LatLng;
  }
  interface MapOptions {
    center?: [number, number];
    zoom?: number;
    zoomControl?: boolean;
    scrollWheelZoom?: boolean;
    touchZoom?: boolean;
    doubleClickZoom?: boolean;
  }
  interface TileLayerOptions {
    attribution?: string;
    maxZoom?: number;
  }
  interface MarkerOptions {
    draggable?: boolean;
  }
  interface Map {
    on(event: string, handler: (e: LeafletMouseEvent) => void): this;
    remove(): void;
    invalidateSize(): void;
  }
  interface Marker {
    addTo(map: Map): this;
    remove(): void;
    getLatLng(): LatLng;
    on(event: string, handler: () => void): this;
  }
  interface TileLayer {
    addTo(map: Map): this;
  }
  interface IconDefaultStatic {
    mergeOptions(options: Record<string, unknown>): void;
  }
  interface IconStatic {
    Default: IconDefaultStatic;
  }

  function map(el: HTMLElement, options?: MapOptions): Map;
  function marker(latlng: [number, number], options?: MarkerOptions): Marker;
  function tileLayer(url: string, options?: TileLayerOptions): TileLayer;
  const Icon: IconStatic;

  export {
    type LatLng,
    type LeafletMouseEvent,
    type Map,
    type Marker,
    type TileLayer,
    type MapOptions,
    type MarkerOptions,
    type TileLayerOptions,
    type IconStatic,
    type IconDefaultStatic,
    map,
    marker,
    tileLayer,
    Icon,
  };

  const L: {
    map: typeof map;
    marker: typeof marker;
    tileLayer: typeof tileLayer;
    Icon: IconStatic;
  };
  export default L;
}

// Namespace alias so L.Map etc work as types
declare namespace L {
  interface LatLng {
    lat: number;
    lng: number;
  }
  interface LeafletMouseEvent {
    latlng: LatLng;
  }
  interface Map {
    on(event: string, handler: (e: LeafletMouseEvent) => void): this;
    remove(): void;
    invalidateSize(): void;
  }
  interface Marker {
    addTo(map: Map): this;
    remove(): void;
    getLatLng(): LatLng;
    on(event: string, handler: () => void): this;
  }
}

declare module "leaflet/dist/leaflet.css" {
  const css: string;
  export default css;
}
declare module "leaflet/dist/images/marker-icon-2x.png" {
  const src: string;
  export default src;
}
declare module "leaflet/dist/images/marker-icon.png" {
  const src: string;
  export default src;
}
declare module "leaflet/dist/images/marker-shadow.png" {
  const src: string;
  export default src;
}
