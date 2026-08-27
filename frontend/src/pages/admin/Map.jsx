import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getReports } from "../../services/api";

// Custom glowing DivIcons matching severity levels
const createSeverityIcon = (severity) => {
  const sev = (severity || "low").toLowerCase();
  const color =
    sev === "high" ? "#ff4d4d" : sev === "medium" ? "#ffaa00" : "#22d3ee";

  return L.divIcon({
    className: "custom-map-marker-icon",
    html: `<div style="
      width: 20px;
      height: 20px;
      background-color: ${color};
      border: 3px solid #080e10;
      border-radius: 50%;
      box-shadow: 0 0 12px ${color};
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
  });
};

// Component to dynamically fit map bounds around valid report markers
function MapBoundsController({ validReports }) {
  const map = useMap();

  useEffect(() => {
    if (validReports && validReports.length > 0) {
      const positions = validReports.map((r) => [
        r.location.coordinates[1], // Latitude
        r.location.coordinates[0], // Longitude
      ]);

      if (positions.length === 1) {
        map.setView(positions[0], 14);
      } else if (positions.length > 1) {
        const bounds = L.latLngBounds(positions);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [validReports, map]);

  return null;
}

function Map() {
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getReports();
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load report locations from database.");
    } finally {
      setLoading(false);
    }
  };

  const formatDamageType = (type) => {
    if (!type) return "Other Damage";
    return type
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const formatReportId = (rawId) => {
    if (!rawId) return "RW-0000";
    return `RW-${rawId.slice(-6).toUpperCase()}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Filter valid reports with proper GeoJSON coordinates [longitude, latitude]
  const validReports = reports.filter((r) => {
    if (!r.location || !Array.isArray(r.location.coordinates)) return false;
    const [lng, lat] = r.location.coordinates;
    return typeof lat === "number" && typeof lng === "number" && (lat !== 0 || lng !== 0);
  });

  // Default fallback map center if no reports (Lucknow / Uttar Pradesh area)
  const defaultCenter =
    validReports.length > 0
      ? [validReports[0].location.coordinates[1], validReports[0].location.coordinates[0]]
      : [26.8467, 80.9462];

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <div className="admin-logo">R</div>

          <div>
            <strong>RoadWise</strong>
            <span>Admin Portal</span>
          </div>
        </div>

        <nav className="admin-nav">
          <button onClick={() => navigate("/admin/dashboard")}>
            Dashboard
          </button>

          <button onClick={() => navigate("/admin/reports")}>
            Reports
          </button>

          <button className="active">Road Map</button>
        </nav>

        <button
          className="admin-logout"
          onClick={() => navigate("/admin/login")}
        >
          Sign out
        </button>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <p>ROADWISE ADMINISTRATION</p>
            <h1>Road Damage Map</h1>
          </div>

          <div className="admin-user">
            <div className="admin-user-avatar">A</div>

            <div>
              <strong>Administrator</strong>
              <span>Road Authority</span>
            </div>
          </div>
        </header>

        {error && (
          <div
            style={{
              padding: "16px 20px",
              marginBottom: "20px",
              color: "#ff9b9b",
              background: "rgba(255, 70, 70, 0.08)",
              borderRadius: "10px",
              border: "1px solid rgba(255, 70, 70, 0.2)",
              fontSize: "12px",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <section className="map-layout">
          <div className="admin-panel map-panel">
            <div className="map-header">
              <div>
                <p>LIVE REPORT LOCATIONS</p>
                <h2>Damage Overview ({validReports.length} Active)</h2>
              </div>

              <div className="map-legend">
                <span>
                  <i className="legend-dot high-dot"></i>
                  High
                </span>

                <span>
                  <i className="legend-dot medium-dot"></i>
                  Medium
                </span>

                <span>
                  <i className="legend-dot low-dot"></i>
                  Low
                </span>
              </div>
            </div>

            <div className="road-map" style={{ position: "relative", minHeight: "480px", overflow: "hidden", borderRadius: "12px" }}>
              {loading ? (
                <div
                  style={{
                    display: "grid",
                    placeItems: "center",
                    height: "100%",
                    minHeight: "480px",
                    color: "#8b9c9f",
                    fontSize: "13px",
                    background: "#080e10",
                  }}
                >
                  Loading interactive map & report coordinates...
                </div>
              ) : (
                <MapContainer
                  center={defaultCenter}
                  zoom={12}
                  scrollWheelZoom={true}
                  style={{ width: "100%", height: "100%", minHeight: "480px", background: "#060c0e" }}
                >
                  <MapBoundsController validReports={validReports} />

                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {validReports.map((report) => {
                    const lng = report.location.coordinates[0];
                    const lat = report.location.coordinates[1];
                    const displayId = formatReportId(report._id);
                    const severity = (report.severity || "low").toLowerCase();
                    const icon = createSeverityIcon(severity);

                    return (
                      <Marker
                        key={report._id}
                        position={[lat, lng]}
                        icon={icon}
                      >
                        <Popup className="custom-map-popup">
                          <div style={{ padding: "4px 2px", color: "#0b1315" }}>
                            <div style={{ fontSize: "10px", color: "#647478", fontWeight: "700" }}>
                              {displayId}
                            </div>
                            <strong style={{ fontSize: "14px", display: "block", margin: "3px 0 6px", color: "#111" }}>
                              {formatDamageType(report.damageType)}
                            </strong>

                            <div style={{ fontSize: "11px", marginBottom: "4px" }}>
                              Severity:{" "}
                              <strong
                                style={{
                                  color:
                                    severity === "high"
                                      ? "#d93838"
                                      : severity === "medium"
                                      ? "#d98200"
                                      : "#0288d1",
                                }}
                              >
                                {severity.toUpperCase()}
                              </strong>
                            </div>

                            <div style={{ fontSize: "11px", marginBottom: "4px", color: "#333" }}>
                              Priority Score: <strong>{report.priorityScore ?? 0}/100</strong>
                            </div>

                            <div style={{ fontSize: "10px", color: "#666", marginBottom: "8px" }}>
                              Lat: {lat.toFixed(5)}, Lng: {lng.toFixed(5)}
                            </div>

                            <button
                              style={{
                                width: "100%",
                                padding: "6px 10px",
                                background: "#0b1315",
                                color: "#22d3ee",
                                border: 0,
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "11px",
                                fontWeight: "700",
                              }}
                              onClick={() => navigate(`/admin/reports/${report._id}`)}
                            >
                              View Details →
                            </button>

                            <a
                              href={`https://www.google.com/maps?q=${lat},${lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "block",
                                width: "100%",
                                padding: "6px 10px",
                                marginTop: "6px",
                                background: "rgba(34, 211, 238, 0.12)",
                                color: "#0891b2",
                                border: "1px solid rgba(34, 211, 238, 0.3)",
                                borderRadius: "6px",
                                textDecoration: "none",
                                textAlign: "center",
                                fontSize: "11px",
                                fontWeight: "700",
                                boxSizing: "border-box",
                              }}
                            >
                              📍 Open in Google Maps ↗
                            </a>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              )}
            </div>
          </div>

          <div className="admin-panel map-reports">
            <div className="admin-panel-header">
              <div>
                <p>LOCATIONS</p>
                <h2>Reported Issues</h2>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#8b9c9f", fontSize: "12px" }}>
                Loading issues...
              </div>
            ) : validReports.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#69777b", fontSize: "12px" }}>
                No active report locations in database.
              </div>
            ) : (
              <div className="map-report-list">
                {validReports.map((report) => {
                  const displayId = formatReportId(report._id);
                  const severity = (report.severity || "low").toLowerCase();
                  const address = report.location?.address || `${report.location.coordinates[1].toFixed(4)}, ${report.location.coordinates[0].toFixed(4)}`;

                  return (
                    <button
                      className="map-report-item"
                      key={report._id}
                      onClick={() => navigate(`/admin/reports/${report._id}`)}
                    >
                      <div>
                        <strong>{address}</strong>
                        <span>
                          {displayId} · {formatDamageType(report.damageType)}
                        </span>
                      </div>

                      <span className={`severity ${severity}`}>
                        {severity.toUpperCase()}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Map;