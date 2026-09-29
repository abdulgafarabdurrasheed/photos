"use client";
import MapLibreMap, { Marker } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/lib/maplibre-worker";
import { OPENFREEMAP_DARK_STYLE_URL } from "@/lib/constants";

interface Props {
  lat: number;
  lng: number;
  zoom?: number;
  className?: string;
}
export default function MiniMap({
  lat,
  lng,
  zoom = 13,
  className = "h-48 w-full rounded-lg overflow-hidden",
}: Props) {
  return (
    <div className={className}>
      <MapLibreMap
        longitude={lng}
        latitude={lat}
        zoom={zoom}
        mapStyle={OPENFREEMAP_DARK_STYLE_URL}
        interactive={false}
        attributionControl={{ compact: true }}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
      >
        <Marker longitude={lng} latitude={lat} />
      </MapLibreMap>
    </div>
  );
}
