"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Snowflake, Navigation, Lock, ChevronLeft, ChevronRight, Thermometer } from "lucide-react";
import type { Space } from "@/lib/api";

const convertTemp = (temp: number, from: "C" | "F", to: "C" | "F") => {
  if (from === to) return temp;
  if (from === "C" && to === "F") {
    return Math.round((temp * 9 / 5 + 32) * 10) / 10;
  }
  if (from === "F" && to === "C") {
    return Math.round(((temp - 32) * 5 / 9) * 10) / 10;
  }
  return temp;
};

const convertDeltaTemp = (temp: number, from: "C" | "F", to: "C" | "F") => {
  if (from === to) return temp;
  if (from === "C" && to === "F") {
    return Math.round((temp * 9 / 5) * 10) / 10;
  }
  if (from === "F" && to === "C") {
    return Math.round((temp * 5 / 9) * 10) / 10;
  }
  return temp;
};

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
  onRequestAccess?: (space: Space) => void;
  myRequests?: any[]; // AccessRequest list
  centerSpace?: Space | null;
  onLocationUpdate?: (lat: number, lng: number) => void;
}

// Subcomponent to gain access to useMap() and display controls
function MapControlsAndUserMarker({ spaces = [], onLocationUpdate }: { spaces: Space[], onLocationUpdate?: (lat: number, lng: number) => void }) {
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
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLoc(latLng);
        map.flyTo([latLng.lat, latLng.lng], 15, { animate: true, duration: 1.2 });
        setLocating(false);
        onLocationUpdate?.(latLng.lat, latLng.lng);
      },
      (err) => {
        console.warn("Location error:", err);
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

function SpaceMarker({ 
  space, 
  onRequestAccess, 
  myRequests 
}: { 
  space: Space; 
  onRequestAccess?: (space: Space) => void; 
  myRequests?: any[];
}) {
  const [tempUnit, setTempUnit] = useState<"C" | "F">(space.maintained_temp_unit || "C");
  const [imageIdx, setImageIdx] = useState(0);

  const images = space.images && space.images.length > 0 
    ? space.images 
    : (space.image_url ? [space.image_url] : []);

  const hasMaintainedTemp = space.maintained_temp !== undefined && space.maintained_temp !== null;
  const hasCooldownFactor = space.cooldown_factor !== undefined && space.cooldown_factor !== null;
  
  const displayTemp = hasMaintainedTemp
    ? convertTemp(space.maintained_temp!, space.maintained_temp_unit || "C", tempUnit)
    : null;

  const displayCooldown = hasCooldownFactor
    ? convertDeltaTemp(space.cooldown_factor!, space.maintained_temp_unit || "C", tempUnit)
    : null;

  const handleToggleUnit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTempUnit(prev => (prev === "C" ? "F" : "C"));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImageIdx(prev => (prev + 1) % images.length);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImageIdx(prev => (prev - 1 + images.length) % images.length);
  };

  return (
    <Marker position={[space.lat, space.lng]} icon={createCustomIcon(space.is_private)}>
      <Popup className="custom-popup">
        <div className="w-64">
          {images.length > 0 && (
            <div className="relative w-full h-36 bg-gray-100 rounded-t-md overflow-hidden group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[imageIdx]}
                alt={`${space.name} view ${imageIdx + 1}`}
                className="w-full h-full object-cover transition-all duration-300"
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-opacity shadow z-[500]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-opacity shadow z-[500]"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 bg-black/50 text-[10px] text-white px-2 py-0.5 rounded-full font-mono z-[500]">
                    {imageIdx + 1} / {images.length}
                  </div>
                </>
              )}
            </div>
          )}
          <div className={images.length > 0 ? "px-1 pb-1 pt-2" : "p-1"}>
            <div className="flex justify-between items-start mb-1.5">
              <h3 className="font-semibold text-base leading-tight text-gray-900">{space.name}</h3>
              {space.is_private ? (
                <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 font-bold shrink-0">
                  <Lock className="w-2.5 h-2.5" /> Private
                </span>
              ) : (
                <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0">
                  Public
                </span>
              )}
            </div>

            {/* Separated Description & Rules Columns */}
            <div className="space-y-1.5 mb-2.5">
              <div>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Description</span>
                <p className="text-xs text-gray-700 leading-normal">{space.description}</p>
              </div>
              {space.rules && (
                <div className="bg-slate-50 border-l-2 border-slate-300 p-1.5 rounded-r">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Space Rules</span>
                  <p className="text-[11px] text-gray-600 leading-normal italic">{space.rules}</p>
                </div>
              )}
            </div>

            {/* Maintained At Temperature (Click to interconvert) */}
            <div className="grid grid-cols-1 gap-1 mb-3">
              {(hasMaintainedTemp || hasCooldownFactor) && (
                <div 
                  onClick={handleToggleUnit}
                  className={`flex items-center justify-between ${hasCooldownFactor ? 'bg-indigo-50/70 hover:bg-indigo-50 border-indigo-100' : 'bg-blue-50/70 hover:bg-blue-50 border-blue-100'} border p-2 rounded cursor-pointer transition-colors`}
                  title="Click to convert Celsius/Fahrenheit"
                >
                  <div className="flex items-center gap-1.5">
                    <Thermometer className={`w-3.5 h-3.5 ${hasCooldownFactor ? 'text-indigo-500' : 'text-blue-500'} shrink-0`} />
                    <span className={`text-[11px] font-bold ${hasCooldownFactor ? 'text-indigo-950' : 'text-blue-950'}`}>
                      {hasCooldownFactor ? 'Cooldown Factor:' : 'Maintained at:'}
                    </span>
                  </div>
                  <span className={`text-[11px] font-black ${hasCooldownFactor ? 'text-indigo-600 border-indigo-200' : 'text-blue-600 border-blue-200'} bg-white px-2 py-0.5 rounded border`}>
                    {hasCooldownFactor ? `-${displayCooldown}°${tempUnit}` : `${displayTemp}°${tempUnit}`}
                  </span>
                </div>
              )}

              {space.effective_temp && (
                <div className="flex items-center justify-between bg-gray-50 border border-gray-150 p-2 rounded">
                  <div className="flex items-center gap-1.5">
                    <Snowflake className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                    <span className="text-[11px] font-medium text-gray-600">Effective Temp:</span>
                  </div>
                  <span className="text-[11px] font-bold text-cyan-600">
                    {space.effective_temp}°F
                  </span>
                </div>
              )}
            </div>

            {space.is_private ? (
              (() => {
                const req = myRequests?.find((r) => r.space_id === space.id);
                if (req?.status === "approved") {
                  return (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] bg-green-100 text-green-700 py-1.5 rounded text-center font-bold">✓ Approved Access</span>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${space.lat},${space.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-1.5 rounded text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <Navigation className="w-3.5 h-3.5" /> Get Directions
                      </a>
                    </div>
                  );
                }
                if (req?.status === "pending") {
                  return (
                    <button disabled className="w-full bg-yellow-100 text-yellow-700 py-1.5 rounded text-xs font-semibold cursor-not-allowed">
                      Request Pending
                    </button>
                  );
                }
                if (req?.status === "rejected") {
                  return (
                    <button disabled className="w-full bg-red-100 text-red-700 py-1.5 rounded text-xs font-semibold cursor-not-allowed">
                      Request Rejected
                    </button>
                  );
                }
                return (
                  <button 
                    onClick={() => onRequestAccess?.(space)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-1.5 rounded text-xs font-semibold transition-colors"
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
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Navigation className="w-3.5 h-3.5" /> Get Directions
              </a>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

export default function Map({ spaces = [], onRequestAccess, myRequests = [], centerSpace = null, onLocationUpdate }: MapProps) {
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
      <MapControlsAndUserMarker spaces={spaces} onLocationUpdate={onLocationUpdate} />
      <MapCenterHandler centerSpace={centerSpace} />

      {spaces.map((space) => (
        <SpaceMarker 
          key={space.id} 
          space={space} 
          onRequestAccess={onRequestAccess} 
          myRequests={myRequests} 
        />
      ))}
    </MapContainer>
  );
}
