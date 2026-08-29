import { useState, useEffect, useRef, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { searchLocations, reverseGeocode } from "../../services/api";

// Custom glowing pin icon for interactive location picker
const createPickerIcon = () => {
  return L.divIcon({
    className: "location-picker-marker",
    html: `<div style="
      position: relative;
      width: 28px;
      height: 28px;
      background: #22d3ee;
      border: 3px solid #080e10;
      border-radius: 50%;
      box-shadow: 0 0 16px rgba(34, 211, 238, 0.8), 0 0 32px rgba(34, 211, 238, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #080e10;
      font-weight: 900;
      font-size: 13px;
      cursor: grab;
    ">📍</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

// Map controller to smoothly fly to updated coordinates
function MapFlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && typeof center[0] === "number" && typeof center[1] === "number") {
      map.flyTo(center, zoom || 16, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

// Map event listener for click-to-pin
function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng, "Map Click");
    },
  });
  return null;
}

export default function LocationPicker({
  location,
  onChangeLocation,
  address,
  onChangeAddress,
  setError,
}) {
  const [activeTab, setActiveTab] = useState("search"); // 'search' or 'gps'
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [locating, setLocating] = useState(false);
  const [gpsStatus, setGpsStatus] = useState("");

  const dropdownRef = useRef(null);
  const watchIdRef = useRef(null);
  const timeoutIdRef = useRef(null);

  const markerIcon = useMemo(() => createPickerIcon(), []);

  // Default initial map center (India center if no location selected)
  const defaultCenter = useMemo(() => [20.5937, 78.9629], []);
  const mapCenter = location
    ? [location.latitude, location.longitude]
    : defaultCenter;
  const mapZoom = location ? 16 : 5;

  // Handle outside click to dismiss suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    if (!value || value.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      setSearching(false);
    }
  };

  // Live debounced location search (Google Maps style)
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) return;

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchLocations(searchQuery);
        setSuggestions(results);
        setShowDropdown(results.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handler when a suggestion is clicked
  const handleSelectSuggestion = (item) => {
    setShowDropdown(false);
    setSearchQuery(item.shortName);
    onChangeAddress(item.shortName);
    onChangeLocation({
      latitude: item.latitude,
      longitude: item.longitude,
      accuracy: 10,
      source: "Search",
    });
    setError("");
  };

  // Handler when map is clicked or marker dragged
  const handleMapPinSelect = async (lat, lng, source = "Map Pin") => {
    onChangeLocation({
      latitude: lat,
      longitude: lng,
      accuracy: 8,
      source,
    });
    setError("");

    // Reverse geocode to get street address
    try {
      const resolved = await reverseGeocode(lat, lng);
      if (resolved) {
        onChangeAddress(resolved);
        setSearchQuery(resolved);
      }
    } catch {
      // Keep existing address if resolution fails
    }
  };

  // GPS Auto-Acquisition logic
  const stopGps = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timeoutIdRef.current !== null) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    setLocating(false);
  };

  const handleStartGps = () => {
    setError("");
    stopGps();

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setLocating(true);
    setGpsStatus("Connecting to GPS satellites...");

    let bestReading = null;

    timeoutIdRef.current = setTimeout(() => {
      stopGps();
      if (bestReading) {
        applyGpsReading(bestReading);
      } else {
        setError("GPS acquisition timed out. Please use the Search / Map Pin mode.");
      }
    }, 10000);

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const reading = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };

          if (!bestReading || reading.accuracy < bestReading.accuracy) {
            bestReading = reading;
            setGpsStatus(`Acquiring accuracy: ±${Math.round(reading.accuracy)}m...`);
          }

          if (reading.accuracy <= 15) {
            stopGps();
            applyGpsReading(bestReading);
          }
        },
        (err) => {
          stopGps();
          if (err.code === err.PERMISSION_DENIED) {
            setError("Location permission denied. Please use the Search / Map Pin mode.");
          } else {
            setError("Unable to retrieve GPS coordinates. Please use Search / Map Pin mode.");
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000,
        }
      );
    } catch {
      stopGps();
      setError("Failed to initiate GPS.");
    }
  };

  const applyGpsReading = async (reading) => {
    onChangeLocation({
      latitude: reading.latitude,
      longitude: reading.longitude,
      accuracy: reading.accuracy,
      source: "GPS",
    });
    setGpsStatus(`✓ Acquired location (±${Math.round(reading.accuracy)}m)`);

    try {
      const resolved = await reverseGeocode(reading.latitude, reading.longitude);
      if (resolved) {
        onChangeAddress(resolved);
        setSearchQuery(resolved);
      }
    } catch {
      // Ignored
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
      {/* Mode Selector Tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          background: "rgba(255, 255, 255, 0.03)",
          padding: "4px",
          borderRadius: "10px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab("search");
            stopGps();
          }}
          style={{
            flex: 1,
            padding: "8px 14px",
            borderRadius: "8px",
            border: "none",
            background:
              activeTab === "search"
                ? "rgba(34, 211, 238, 0.15)"
                : "transparent",
            color: activeTab === "search" ? "#22d3ee" : "#8b9c9f",
            fontWeight: "700",
            fontSize: "12px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            transition: "all 0.2s ease",
          }}
        >
          🔍 Search & Pin on Map
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("gps");
            handleStartGps();
          }}
          style={{
            flex: 1,
            padding: "8px 14px",
            borderRadius: "8px",
            border: "none",
            background:
              activeTab === "gps"
                ? "rgba(34, 211, 238, 0.15)"
                : "transparent",
            color: activeTab === "gps" ? "#22d3ee" : "#8b9c9f",
            fontWeight: "700",
            fontSize: "12px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            transition: "all 0.2s ease",
          }}
        >
          🛰️ Auto GPS Detect
        </button>
      </div>

      {/* SEARCH MODE CONTENT */}
      {activeTab === "search" && (
        <div ref={dropdownRef} style={{ position: "relative", width: "100%" }}>
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: "14px",
                fontSize: "14px",
                color: "#22d3ee",
                pointerEvents: "none",
              }}
            >
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setShowDropdown(true);
              }}
              placeholder="Search city, street, landmark (e.g. Civil Lines, MG Road, Hospital)..."
              style={{
                width: "100%",
                padding: "12px 38px 12px 40px",
                borderRadius: "10px",
                background: "rgba(10, 18, 22, 0.8)",
                border: "1px solid rgba(34, 211, 238, 0.3)",
                color: "#f0f6f8",
                fontSize: "13px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {searching && (
              <span
                style={{
                  position: "absolute",
                  right: "14px",
                  fontSize: "11px",
                  color: "#22d3ee",
                  animation: "pulse 1s infinite",
                }}
              >
                Searching...
              </span>
            )}
            {searchQuery && !searching && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSuggestions([]);
                  setShowDropdown(false);
                }}
                style={{
                  position: "absolute",
                  right: "12px",
                  background: "transparent",
                  border: "none",
                  color: "#647478",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Autocomplete Suggestions Dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                right: 0,
                background: "#0d161a",
                border: "1px solid rgba(34, 211, 238, 0.4)",
                borderRadius: "10px",
                zIndex: 9999,
                maxHeight: "220px",
                overflowY: "auto",
                boxShadow: "0 12px 32px rgba(0, 0, 0, 0.7)",
              }}
            >
              {suggestions.map((item, index) => (
                <div
                  key={`${item.latitude}-${item.longitude}-${index}`}
                  onClick={() => handleSelectSuggestion(item)}
                  style={{
                    padding: "10px 14px",
                    borderBottom:
                      index < suggestions.length - 1
                        ? "1px solid rgba(255, 255, 255, 0.06)"
                        : "none",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(34, 211, 238, 0.1)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "#22d3ee",
                      marginBottom: "2px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span>📍</span> {item.shortName}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#8b9c9f",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.displayName}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* GPS AUTO MODE CONTENT */}
      {activeTab === "gps" && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            background: "rgba(34, 211, 238, 0.05)",
            border: "1px solid rgba(34, 211, 238, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "11px", color: "#8b9c9f" }}>GPS SATELLITE STATUS</div>
            <div style={{ fontSize: "13px", color: "#f0f6f8", fontWeight: "600" }}>
              {locating ? "🛰️ Detecting coordinates..." : (gpsStatus || "Ready to detect GPS")}
            </div>
          </div>
          <button
            type="button"
            onClick={handleStartGps}
            disabled={locating}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              background: locating ? "rgba(255,255,255,0.1)" : "#22d3ee",
              color: locating ? "#8b9c9f" : "#080e10",
              fontWeight: "700",
              fontSize: "12px",
              border: "none",
              cursor: locating ? "default" : "pointer",
            }}
          >
            {locating ? "Acquiring..." : "🔄 Refresh GPS"}
          </button>
        </div>
      )}

      {/* INTERACTIVE LEAFLET MINI-MAP */}
      <div
        style={{
          width: "100%",
          height: "220px",
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid rgba(34, 211, 238, 0.25)",
          position: "relative",
        }}
      >
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          scrollWheelZoom={true}
          style={{ width: "100%", height: "100%", background: "#080e10" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapFlyTo center={location ? [location.latitude, location.longitude] : null} zoom={16} />
          <MapClickHandler onLocationSelect={handleMapPinSelect} />

          {location && (
            <Marker
              position={[location.latitude, location.longitude]}
              icon={markerIcon}
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target;
                  const pos = marker.getLatLng();
                  handleMapPinSelect(pos.lat, pos.lng, "Dragged Pin");
                },
              }}
            >
              <Popup>
                <div style={{ color: "#080e10", fontSize: "11px", fontWeight: "700" }}>
                  📍 {address || "Pothole Location"}
                  <br />
                  <span style={{ fontSize: "9px", color: "#555" }}>
                    Drag pin to fine-tune exact spot
                  </span>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Map Helper Overlay Badge */}
        <div
          style={{
            position: "absolute",
            bottom: "8px",
            left: "8px",
            background: "rgba(8, 14, 16, 0.85)",
            backdropFilter: "blur(6px)",
            padding: "4px 10px",
            borderRadius: "6px",
            fontSize: "10px",
            color: "#22d3ee",
            border: "1px solid rgba(34, 211, 238, 0.3)",
            zIndex: 1000,
            pointerEvents: "none",
          }}
        >
          👆 Click map or drag pin to adjust exact pothole spot
        </div>
      </div>

      {/* SELECTED LOCATION CONFIRMATION CARD */}
      {location && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: "10px",
            background: "rgba(34, 211, 238, 0.08)",
            border: "1px solid rgba(34, 211, 238, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "8px",
            textAlign: "left",
          }}
        >
          <div style={{ flex: 1, minWidth: "200px" }}>
            <div
              style={{
                fontSize: "10px",
                color: "#22d3ee",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              ✓ Pinned Location Ready
            </div>
            <div style={{ fontSize: "12px", color: "#f0f6f8", fontWeight: "600", marginTop: "2px" }}>
              {address || `${location.latitude.toFixed(5)}°, ${location.longitude.toFixed(5)}°`}
            </div>
            <div style={{ fontSize: "10px", color: "#8b9c9f", marginTop: "2px" }}>
              Lat: {location.latitude.toFixed(5)}° | Lng: {location.longitude.toFixed(5)}°
            </div>
          </div>

          <span
            style={{
              padding: "4px 8px",
              borderRadius: "6px",
              background: "rgba(34, 211, 238, 0.15)",
              color: "#22d3ee",
              fontSize: "11px",
              fontWeight: "700",
            }}
          >
            {location.source === "GPS"
              ? `🛰️ GPS (±${Math.round(location.accuracy)}m)`
              : "📍 Pinned on Map"}
          </span>
        </div>
      )}
    </div>
  );
}
