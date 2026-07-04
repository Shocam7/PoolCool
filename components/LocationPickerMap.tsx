"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Button } from "@/components/ui/button";

const createPickerIcon = () => {
  const iconMarkup = `
    <div class="relative flex items-center justify-center w-8 h-10 -ml-4 -mt-10 text-red-500">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="absolute w-full h-full drop-shadow-md text-red-500" fill="currentColor">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      </svg>
      <div class="absolute top-[6px] w-3 h-3 bg-white rounded-full shadow-sm"></div>
    </div>
  `;
  return L.divIcon({
    html: iconMarkup,
    className: "custom-leaflet-icon bg-transparent border-none",
    iconSize: [32, 40],
    iconAnchor: [16, 40],
  });
};

interface LocationPickerProps {
  position: { lat: number; lng: number };
  onChange: (pos: { lat: number; lng: number }) => void;
}

function LocationMarker({ position, onChange }: LocationPickerProps) {
  const map = useMap();
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          onChange({ lat: latLng.lat, lng: latLng.lng });
        }
      },
    }),
    [onChange],
  );

  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });

  // Keep map view in sync if position changes significantly, avoiding constant re-centering on tiny drags
  useEffect(() => {
    const mapCenter = map.getCenter();
    if (Math.abs(mapCenter.lat - position.lat) > 0.005 || Math.abs(mapCenter.lng - position.lng) > 0.005) {
      map.flyTo([position.lat, position.lng], map.getZoom(), { animate: true, duration: 0.5 });
    }
  }, [position.lat, position.lng, map]);
  
  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={[position.lat, position.lng]}
      icon={createPickerIcon()}
      ref={markerRef}
    />
  );
}

export default function LocationPickerMap({ position, onChange }: LocationPickerProps) {
  const [mounted, setMounted] = useState(false);
  const [locating, setLocating] = useState(false);
  const mapRef = useRef<L.Map>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const handleLocateMe = (e: React.MouseEvent) => {
    e.preventDefault();
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        console.error(err);
        setLocating(false);
        alert("Failed to get location. Ensure permissions are granted.");
      },
      { enableHighAccuracy: true }
    );
  };

  if (!mounted) return <div className="w-full h-48 bg-gray-100 animate-pulse rounded-md border border-gray-200 flex items-center justify-center text-gray-500 text-sm font-medium">Loading Map...</div>;

  return (
    <div className="relative w-full h-48 rounded-md overflow-hidden border border-gray-300">
      <MapContainer
        center={[position.lat, position.lng]}
        zoom={13}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
        ref={mapRef}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <LocationMarker position={position} onChange={onChange} />
      </MapContainer>
      <Button 
        size="sm" 
        variant="secondary" 
        className="absolute bottom-2 right-2 z-[400] shadow-md bg-white text-blue-600 hover:bg-gray-50 border border-gray-200"
        onClick={handleLocateMe}
        disabled={locating}
      >
        {locating ? "Locating..." : "Use My GPS"}
      </Button>
    </div>
  );
}
