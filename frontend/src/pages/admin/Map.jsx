import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Circle, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getIssues, getReports, logoutAdmin } from "../../services/api";

// Custom glowing DivIcon for Issues with optional report count badge
const createIssueMarkerIcon = (severity, reportCount) => {
  const sev = (severity || "low").toLowerCase();
  const color =
    sev === "high" ? "#ff4d4d" : sev === "medium" ? "#ffaa00" : "#22d3ee";
  const count = reportCount || 1;
  const badgeHtml =
    count > 1
      ? `<span style="
          position: absolute;
          top: -7px;
          right: -9px;
          background: #080e10;
          color: ${color};
          border: 1.5px solid ${color};
          border-radius: 10px;
          font-size: 9px;
          font-weight: 800;
          padding: 1px 4px;
          box-shadow: 0 0 6px ${color};
          line-height: 1.1;
        ">${count}</span>`
      : "";

  return L.divIcon({
    className: "custom-map-marker-icon",
    html: `<div style="
      position: relative;
      width: 22px;
      height: 22px;
      background-color: ${color};
      border: 3px solid #080e10;
      border-radius: 50%;
      box-shadow: 0 0 14px ${color};
    ">${badgeHtml}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
  });
};

// Component to dynamically fit map bounds around valid issue markers
function MapBoundsController({ validIssues }) {
  const map = useMap();

  useEffect(() => {
    if (validIssues && validIssues.length > 0) {
      const positions = validIssues.map((item) => [
        item.location.coordinates[1], // Latitude
        item.location.coordinates[0], // Longitude
      ]);

      if (positions.length === 1) {
        map.setView(positions[0], 14);
      } else if (positions.length > 1) {
        const bounds = L.latLngBounds(positions);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [validIssues, map]);

  return null;
}

function Map() {
  const navigate = useNavigate();

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mapMode, setMapMode] = useState("clusters"); // "clusters" or "heatmap"

  useEffect(() => {
    let isMounted = true;

    const loadIssuesData = async () => {
      setLoading(true);
      setError("");
      try {
        // Primary: Fetch grouped Issues
        const data = await getIssues();
        if (isMounted) {
          if (Array.isArray(data) && data.length > 0) {
            setIssues(data);
          } else {
            // Fallback: If no issues found, fetch reports and construct fallback issue items
            const rawReports = await getReports();
            if (Array.isArray(rawReports)) {
              const fallbackIssues = rawReports.map((r) => ({
                _id: r._id,
                damageType: r.damageType,
                severity: r.severity,
                location: r.location,
                reports: [r],
                reportCount: 1,
                priorityScore: r.priorityScore || 0,
                status: r.status || "reported",
                createdAt: r.createdAt,
              }));
              setIssues(fallbackIssues);
            } else {
              setIssues([]);
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load road issues from database.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadIssuesData();

    return () => {
      isMounted = false;
    };
  }, []);

  const formatDamageType = (type) => {
    if (!type) return "Other Damage";
    return type
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const formatIssueId = (rawId) => {
    if (!rawId) return "ISSUE-0000";
    return `ISSUE-${rawId.slice(-6).toUpperCase()}`;
  };

  // Filter valid issues with proper GeoJSON coordinates [longitude, latitude]
  const validIssues = issues.filter((item) => {
    if (!item.location || !Array.isArray(item.location.coordinates)) return false;
    const [lng, lat] = item.location.coordinates;
    return typeof lat === "number" && typeof lng === "number" && (lat !== 0 || lng !== 0);
  });

  // Default fallback map center if no issues (Lucknow area)
  const defaultCenter =
    validIssues.length > 0
      ? [validIssues[0].location.coordinates[1], validIssues[0].location.coordinates[0]]
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
          onClick={() => {
            logoutAdmin();
            navigate("/admin/login");
          }}
        >
          Sign out
        </button>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <p>ROADWISE ADMINISTRATION</p>
            <h1>Grouped Road Issues Map</h1>
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
                <p>CLUSTERED ROAD DEFECTS</p>
                <h2>Grouped Issues ({validIssues.length} Active)</h2>
              </div>

              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setMapMode("clusters")}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid rgba(34, 211, 238, 0.3)",
                      background: mapMode === "clusters" ? "rgba(34, 211, 238, 0.25)" : "transparent",
                      color: mapMode === "clusters" ? "#22d3ee" : "#8b9c9f",
                      fontSize: "11px",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    📌 Clustered Markers
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapMode("heatmap")}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid rgba(255, 77, 77, 0.3)",
                      background: mapMode === "heatmap" ? "rgba(255, 77, 77, 0.25)" : "transparent",
                      color: mapMode === "heatmap" ? "#ff6b6b" : "#8b9c9f",
                      fontSize: "11px",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    🔥 Hazard Density Heatmap
                  </button>
                </div>

                <div className="map-legend">
                  <span>
                    <i className="legend-dot high-dot"></i>
                    High Severity
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
                  Loading interactive map & grouped issue clusters...
                </div>
              ) : (
                <MapContainer
                  center={defaultCenter}
                  zoom={12}
                  scrollWheelZoom={true}
                  style={{ width: "100%", height: "100%", minHeight: "480px", background: "#060c0e" }}
                >
                  <MapBoundsController validIssues={validIssues} />

                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {mapMode === "heatmap"
                    ? validIssues.map((issueItem) => {
                        const lng = issueItem.location.coordinates[0];
                        const lat = issueItem.location.coordinates[1];
                        const severity = (issueItem.severity || "low").toLowerCase();
                        const priority = issueItem.priorityScore || 50;
                        const rCount = issueItem.reportCount || 1;

                        const heatColor =
                          severity === "high"
                            ? "#ef4444"
                            : severity === "medium"
                            ? "#f59e0b"
                            : "#06b6d4";

                        const radiusMeters = 40 + Math.min(80, rCount * 15 + priority * 0.4);

                        return (
                          <div key={`heat-${issueItem._id}`}>
                            <Circle
                              center={[lat, lng]}
                              radius={radiusMeters}
                              pathOptions={{
                                fillColor: heatColor,
                                fillOpacity: 0.35,
                                color: heatColor,
                                opacity: 0.8,
                                weight: 2,
                              }}
                            />
                            <CircleMarker
                              center={[lat, lng]}
                              radius={8}
                              pathOptions={{
                                fillColor: "#ffffff",
                                fillOpacity: 0.9,
                                color: heatColor,
                                weight: 3,
                              }}
                            >
                              <Popup className="custom-map-popup">
                                <div style={{ padding: "4px", color: "#111" }}>
                                  <strong>🔥 Hazard Hotspot</strong>
                                  <div style={{ fontSize: "12px", marginTop: "2px" }}>
                                    {formatDamageType(issueItem.damageType)} · {severity.toUpperCase()}
                                  </div>
                                  <div style={{ fontSize: "11px", color: "#666" }}>
                                    Reports Clustered: {rCount} · Priority: {priority}/100
                                  </div>
                                </div>
                              </Popup>
                            </CircleMarker>
                          </div>
                        );
                      })
                    : validIssues.map((issueItem) => {
                        const lng = issueItem.location.coordinates[0];
                        const lat = issueItem.location.coordinates[1];
                        const displayId = formatIssueId(issueItem._id);
                        const severity = (issueItem.severity || "low").toLowerCase();
                        const rCount = issueItem.reportCount || (issueItem.reports ? issueItem.reports.length : 1);
                        const icon = createIssueMarkerIcon(severity, rCount);

                        return (
                          <Marker
                            key={issueItem._id}
                            position={[lat, lng]}
                            icon={icon}
                          >
                            <Popup className="custom-map-popup">
                              <div style={{ padding: "6px 4px", color: "#0b1315", minWidth: "200px" }}>
                                <div style={{ fontSize: "10px", color: "#647478", fontWeight: "700", textTransform: "uppercase" }}>
                                  ROAD ISSUE · {displayId}
                                </div>
                                <strong style={{ fontSize: "14px", display: "block", margin: "4px 0 2px", color: "#111" }}>
                                  {formatDamageType(issueItem.damageType)}
                                </strong>

                                <div style={{ fontSize: "11px", marginBottom: "3px" }}>
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

                                <div style={{ fontSize: "11px", marginBottom: "3px", color: "#333" }}>
                                  Reports: <strong>{rCount}</strong>
                                </div>

                                <div style={{ fontSize: "11px", marginBottom: "4px", color: "#333" }}>
                                  Status: <strong>{issueItem.status || "Open"}</strong>
                                </div>

                                <div style={{ fontSize: "10px", color: "#666", marginBottom: "8px" }}>
                                  Location: {lat.toFixed(5)}, {lng.toFixed(5)}
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
                                    marginBottom: "6px",
                                  }}
                                  onClick={() => navigate(`/admin/issues/${issueItem._id}`)}
                                >
                                  View Supporting Reports ({rCount}) →
                                </button>

                                <a
                                  href={`https://www.google.com/maps?q=${lat},${lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "6px 10px",
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
                <h2>Grouped Issues</h2>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#8b9c9f", fontSize: "12px" }}>
                Loading issues...
              </div>
            ) : validIssues.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#69777b", fontSize: "12px" }}>
                No active grouped issues in database.
              </div>
            ) : (
              <div className="map-report-list">
                {validIssues.map((issueItem) => {
                  const displayId = formatIssueId(issueItem._id);
                  const severity = (issueItem.severity || "low").toLowerCase();
                  const rCount = issueItem.reportCount || (issueItem.reports ? issueItem.reports.length : 1);
                  const address = issueItem.location?.address || `${issueItem.location.coordinates[1].toFixed(4)}, ${issueItem.location.coordinates[0].toFixed(4)}`;

                  return (
                    <div
                      className="map-report-item"
                      key={issueItem._id}
                      style={{ flexDirection: "column", alignItems: "stretch", gap: "6px", cursor: "default" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <strong style={{ fontSize: "13px" }}>{address}</strong>
                          <span style={{ fontSize: "11px", display: "block", color: "#8b9c9f" }}>
                            {displayId} · {formatDamageType(issueItem.damageType)}
                          </span>
                        </div>

                        <span className={`severity ${severity}`}>
                          {severity.toUpperCase()}
                        </span>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "4px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <span style={{ fontSize: "11px", color: "#22d3ee", fontWeight: "700" }}>
                          👥 {rCount} Report{rCount > 1 ? "s" : ""}
                        </span>

                        <button
                          onClick={() => navigate(`/admin/issues/${issueItem._id}`)}
                          style={{
                            background: "rgba(34, 211, 238, 0.1)",
                            color: "#22d3ee",
                            border: "1px solid rgba(34, 211, 238, 0.3)",
                            padding: "4px 10px",
                            borderRadius: "4px",
                            fontSize: "10px",
                            fontWeight: "700",
                            cursor: "pointer",
                          }}
                        >
                          View Issue →
                        </button>
                      </div>
                    </div>
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