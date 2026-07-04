"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Snowflake, Navigation, Lock } from "lucide-react";
import type { Space } from "@/lib/api";

// Custom HTML Marker using Lucide Snowflake
const createCustomIcon = (isPrivate: boolean) => {
  const pinColorHex = isPrivate ? "#a855f7" : "#3b82f6";
  
  const iconMarkup = `
    <div class="relative flex items-center justify-center w-8 h-10 -ml-4 -mt-10">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        class="absolute w-full h-full drop-shadow-md" 
        fill="${pinColorHex}"
      >
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      </svg>
      <div class="absolute top-[6px] w-5 h-5 flex items-center justify-center bg-white rounded-full shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${pinColorHex}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-snowflake"><line x1="2" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="22"/><path d="m20 16-4-4 4-4"/><path d="m4 8 4 4-4 4"/><path d="m16 4-4 4-4-4"/><path d="m8 20 4-4 4 4"/></svg>
      </div>
    </div>
  `;

  return L.divIcon({
    html: iconMarkup,
    className: "custom-leaflet-icon bg-transparent border-none",
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
  });
};

interface MapProps {
  spaces?: Space[];
  heatmapEnabled?: boolean;
  onRequestAccess?: (space: Space) => void;
  myRequests?: any[]; // AccessRequest list
  centerSpace?: Space | null;
}

// Subcomponent to gain access to useMap() and display controls
function MapControlsAndUserMarker({ spaces = [] }: { spaces: Space[] }) {
  const map = useMap();
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  // Trigger GPS find on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const latLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLoc(latLng);
          map.setView([latLng.lat, latLng.lng], 13);
        },
        (err) => {
          console.warn("Could not get initial user location automatically:", err);
        },
        { enableHighAccuracy: true }
      );
    }
  }, [map]);

  const handleLocateClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!("geolocation" in navigator)) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLoc(latLng);
        map.flyTo([latLng.lat, latLng.lng], 15, { animate: true, duration: 1.2 });
        setLocating(false);
      },
      (err) => {
        console.error("GPS Error:", err);
        alert("Failed to access your location. Please check browser permissions.");
        setLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  // Pulse icon for user location
  const createUserLocIcon = () => {
    const iconMarkup = `
      <div class="relative flex items-center justify-center w-6 h-6">
        <div class="absolute w-6 h-6 bg-blue-500 rounded-full opacity-40 animate-ping"></div>
        <div class="absolute w-3.5 h-3.5 bg-blue-600 rounded-full border-2 border-white shadow-md"></div>
      </div>
    `;

    return L.divIcon({
      html: iconMarkup,
      className: "user-location-icon bg-transparent border-none",
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  return (
    <>
      {/* User Current Location Marker */}
      {userLoc && (
        <Marker position={[userLoc.lat, userLoc.lng]} icon={createUserLocIcon()}>
          <Popup>
            <div className="text-center font-semibold text-sm p-1">
              📍 You are here
            </div>
          </Popup>
        </Marker>
      )}

      {/* Zero down locate button in the bottom-right */}
      <div className="absolute bottom-20 md:bottom-6 right-4 md:right-6 z-[1000] pointer-events-auto">
        <button
          onClick={handleLocateClick}
          disabled={locating}
          className={`flex items-center justify-center w-12 h-12 bg-white text-blue-600 hover:bg-gray-50 disabled:opacity-50 active:scale-95 transition-all rounded-full shadow-xl border border-gray-100`}
          title="Zoom to my location"
          id="zero-down-loc-btn"
        >
          {locating ? (
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25a7.5 7.5 0 1 1 15 0Z"
              />
            </svg>
          )}
        </button>
      </div>
    </>
  );
}

// Subcomponent to handle flying/panning the map to the centerSpace
function MapCenterHandler({ centerSpace }: { centerSpace: Space | null }) {
  const map = useMap();

  useEffect(() => {
    if (centerSpace) {
      map.flyTo([centerSpace.lat, centerSpace.lng], 16, { animate: true, duration: 1.5 });
    }
  }, [centerSpace, map]);

  return null;
}

export default function Map({ spaces = [], heatmapEnabled = false, onRequestAccess, myRequests = [], centerSpace = null }: MapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-full h-full bg-gray-100 flex items-center justify-center">Loading map...</div>;

  return (
    <MapContainer
      center={[34.0522, -118.2437]}
      zoom={13}
      style={{ height: "100%", width: "100%", zIndex: 0 }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* Inject custom controls and markers */}
      <MapControlsAndUserMarker spaces={spaces} />
      <MapCenterHandler centerSpace={centerSpace} />

      {spaces.map((space) => (
        <Marker key={space.id} position={[space.lat, space.lng]} icon={createCustomIcon(space.is_private)}>
          <Popup className="custom-popup">
            <div className="w-64">
              {space.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={space.image_url}
                  alt={space.name}
                  className="w-full h-32 object-cover rounded-t-md mb-2"
                />
              )}
              <div className={space.image_url ? "px-1 pb-1" : "p-1"}>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-lg leading-tight">{space.name}</h3>
                  {space.is_private ? (
                    <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded flex items-center gap-1 font-medium">
                      <Lock className="w-3 h-3" /> Private
                    </span>
                  ) : (
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-medium">
                      Public
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3">{space.description}</p>
                
                {space.effective_temp && (
                  <div className="flex items-center gap-2 mb-3 bg-gray-50 p-2 rounded">
                    <Snowflake className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium">Effective Temp: {space.effective_temp}°F</span>
                    {space.is_ai_analyzed && (
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded border border-green-200">AI Verified</span>
                    )}
                  </div>
                )}

                {space.is_private ? (
                  (() => {
                    const req = myRequests?.find((r) => r.space_id === space.id);
                    if (req?.status === "approved") {
                      return (
                        <div className="flex flex-col gap-2">
                          <span className="text-xs bg-green-100 text-green-700 py-1 rounded text-center font-bold">✓ Approved Access</span>
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${space.lat},${space.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                          >
                            <Navigation className="w-4 h-4" /> Get Directions
                          </a>
                        </div>
                      );
                    }
                    if (req?.status === "pending") {
                      return (
                        <button disabled className="w-full bg-yellow-100 text-yellow-700 py-2 rounded text-sm font-medium cursor-not-allowed">
                          Request Pending
                        </button>
                      );
                    }
                    if (req?.status === "rejected") {
                      return (
                        <button disabled className="w-full bg-red-100 text-red-700 py-2 rounded text-sm font-medium cursor-not-allowed">
                          Request Rejected
                        </button>
                      );
                    }
                    return (
                      <button 
                        onClick={() => onRequestAccess?.(space)}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded text-sm font-medium transition-colors"
                      >
                        Request Access
                      </button>
                    );
                  })()
                ) : (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${space.lat},${space.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Navigation className="w-4 h-4" /> Get Directions
                  </a>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
