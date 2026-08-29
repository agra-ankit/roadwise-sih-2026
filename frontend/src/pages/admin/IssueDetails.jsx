import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getIssueById } from "../../services/api";

const SERVER_BASE = "http://localhost:5000";

function IssueDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSupportingReports, setShowSupportingReports] = useState(true);

  useEffect(() => {
    if (id) {
      fetchIssueDetails();
    } else {
      setError("No issue ID supplied.");
      setLoading(false);
    }
  }, [id]);

  const fetchIssueDetails = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getIssueById(id);
      if (data) {
        setIssue(data);
      } else {
        setError("Issue not found in database.");
      }
    } catch (err) {
      setError(err.message || "Failed to load issue details from database.");
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

  const formatIssueId = (rawId) => {
    if (!rawId) return "ISSUE-0000";
    return `ISSUE-${rawId.slice(-6).toUpperCase()}`;
  };

  const formatReportId = (rawId) => {
    if (!rawId) return "RW-0000";
    return `RW-${rawId.slice(-6).toUpperCase()}`;
  };

  const formatStatus = (statusStr) => {
    if (!statusStr) return "Open";
    if (statusStr.toLowerCase() === "reported") return "Open";
    return statusStr
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  // GeoJSON coordinates array: [longitude, latitude]
  const longitude = issue?.location?.coordinates?.[0];
  const latitude = issue?.location?.coordinates?.[1];
  const isValidCoordinates =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    (latitude !== 0 || longitude !== 0);

  const addressText = issue?.location?.address || "GPS Location Captured";
  const severityText = (issue?.severity || "low").toUpperCase();
  const reportCount = issue?.reportCount || (issue?.reports ? issue.reports.length : 1);
  const statusText = formatStatus(issue?.status);

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

          <button
            className="active"
            onClick={() => navigate("/admin/map")}
          >
            Road Map
          </button>
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
            <h1>Issue Details</h1>
          </div>

          <div className="admin-user">
            <div className="admin-user-avatar">A</div>

            <div>
              <strong>Administrator</strong>
              <span>Road Authority</span>
            </div>
          </div>
        </header>

        <button
          className="back-button"
          onClick={() => navigate("/admin/map")}
        >
          ← Back to Road Map
        </button>

        {loading ? (
          <div
            style={{
              padding: "60px 20px",
              textAlign: "center",
              color: "#8b9c9f",
              fontSize: "13px",
            }}
          >
            Loading grouped issue details from database...
          </div>
        ) : error || !issue ? (
          <div
            className="admin-panel"
            style={{
              padding: "40px",
              textAlign: "center",
              margin: "20px 0",
            }}
          >
            <h3 style={{ color: "#ff9b9b", marginBottom: "10px" }}>
              ⚠️ {error || "Issue Not Found"}
            </h3>
            <p style={{ color: "#718084", fontSize: "12px", marginBottom: "20px" }}>
              No matching grouped issue was found for ID: {id}
            </p>
            <button
              className="detail-action"
              style={{ width: "auto", margin: "0 auto", padding: "10px 20px" }}
              onClick={() => navigate("/admin/map")}
            >
              ← Return to Road Map
            </button>
          </div>
        ) : (
          <section className="report-details-grid">
            <div className="admin-panel report-detail-main">
              <div className="admin-panel-header">
                <div>
                  <p>ROAD ISSUE</p>
                  <h2>{formatIssueId(issue._id)}</h2>
                </div>

                <span className={`status ${(issue.status || "reported").toLowerCase().replace("_", "-")}`}>
                  {statusText}
                </span>
              </div>

              {/* ROAD ISSUE SUMMARY CARD */}
              <div
                style={{
                  background: "#080e10",
                  padding: "20px",
                  borderRadius: "12px",
                  border: "1px solid rgba(34, 211, 238, 0.15)",
                  marginBottom: "24px",
                }}
              >
                <div className="info-row" style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ color: "#8b9c9f", fontSize: "13px" }}>Damage Type</span>
                  <strong style={{ color: "#f1f5f9", fontSize: "14px" }}>{formatDamageType(issue.damageType)}</strong>
                </div>

                <div className="info-row" style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ color: "#8b9c9f", fontSize: "13px" }}>Severity</span>
                  <strong
                    style={{
                      fontSize: "14px",
                      color:
                        severityText === "HIGH"
                          ? "#ff4d4d"
                          : severityText === "MEDIUM"
                          ? "#ffaa00"
                          : "#22d3ee",
                    }}
                  >
                    {severityText}
                  </strong>
                </div>

                <div className="info-row" style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ color: "#8b9c9f", fontSize: "13px" }}>Reports</span>
                  <strong style={{ color: "#22d3ee", fontSize: "14px" }}>{reportCount} Citizen Report(s)</strong>
                </div>

                <div className="info-row" style={{ padding: "10px 0" }}>
                  <span style={{ color: "#8b9c9f", fontSize: "13px" }}>Status</span>
                  <strong style={{ color: "#f1f5f9", fontSize: "14px" }}>{statusText}</strong>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
                <button
                  className="detail-action"
                  style={{
                    background: showSupportingReports ? "rgba(34, 211, 238, 0.2)" : "rgba(34, 211, 238, 0.08)",
                    borderColor: "rgba(34, 211, 238, 0.4)",
                    color: "#22d3ee",
                    fontWeight: "700",
                    fontSize: "13px",
                    padding: "12px 18px",
                  }}
                  onClick={() => setShowSupportingReports(!showSupportingReports)}
                >
                  📋 {showSupportingReports ? "Hide Supporting Reports" : `View Supporting Reports (${issue.reports?.length || 0})`}
                </button>

                {isValidCoordinates ? (
                  <a
                    href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="detail-action"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      textDecoration: "none",
                      background: "rgba(34, 211, 238, 0.12)",
                      color: "#22d3ee",
                      border: "1px solid rgba(34, 211, 238, 0.3)",
                      borderRadius: "8px",
                      padding: "12px 18px",
                      fontSize: "13px",
                      fontWeight: "700",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    📍 Open in Google Maps ↗
                  </a>
                ) : (
                  <div
                    style={{
                      padding: "10px 14px",
                      background: "rgba(255, 70, 70, 0.08)",
                      border: "1px solid rgba(255, 70, 70, 0.2)",
                      borderRadius: "8px",
                      color: "#ff9b9b",
                      fontSize: "12px",
                      textAlign: "center",
                    }}
                  >
                    ⚠️ Coordinates unavailable for Google Maps
                  </div>
                )}
              </div>

              {/* SUPPORTING REPORTS LIST SECTION */}
              {showSupportingReports && (
                <div className="report-description">
                  <p>SUPPORTING CITIZEN SUBMISSIONS</p>
                  <h3>Attached Reports ({issue.reports?.length || 0})</h3>

                  {issue.reports && issue.reports.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "14px" }}>
                      {issue.reports.map((r) => {
                        const isObj = typeof r === "object" && r !== null;
                        const rId = isObj ? r._id : r;
                        const rSev = isObj ? (r.severity || "low").toUpperCase() : "N/A";
                        const rImg = isObj && r.imageUrl ? (r.imageUrl.startsWith("http") ? r.imageUrl : `${SERVER_BASE}${r.imageUrl}`) : null;

                        return (
                          <div
                            key={rId}
                            style={{
                              display: "flex",
                              justify: "space-between",
                              alignItems: "center",
                              padding: "12px 16px",
                              background: "#080e10",
                              border: "1px solid rgba(255,255,255,0.08)",
                              borderRadius: "10px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              {rImg && (
                                <img
                                  src={rImg}
                                  alt="Report Evidence"
                                  style={{ width: "42px", height: "42px", borderRadius: "6px", objectFit: "cover" }}
                                />
                              )}
                              <div>
                                <strong style={{ color: "#f1f5f9", fontSize: "13px" }}>{formatReportId(rId)}</strong>
                                <span style={{ display: "block", color: "#8b9c9f", fontSize: "11px" }}>
                                  Severity: {rSev} {isObj && r.confidence ? `· AI: ${(r.confidence * 100).toFixed(0)}%` : ""}
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => navigate(`/admin/reports/${rId}`)}
                              style={{
                                background: "rgba(34, 211, 238, 0.1)",
                                color: "#22d3ee",
                                border: "1px solid rgba(34, 211, 238, 0.3)",
                                padding: "6px 12px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: "700",
                                cursor: "pointer",
                              }}
                            >
                              View Report →
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span style={{ color: "#718084", fontSize: "12px" }}>No individual reports linked to this issue.</span>
                  )}
                </div>
              )}
            </div>

            <div className="report-detail-side">
              {/* LOCATION DETAILS CARD */}
              <div className="admin-panel detail-card">
                <p>LOCATION</p>

                <div className="location-details">
                  <strong>{addressText}</strong>

                  <span>
                    Latitude: {isValidCoordinates ? latitude.toFixed(5) : "N/A"}
                    <br />
                    Longitude: {isValidCoordinates ? longitude.toFixed(5) : "N/A"}
                  </span>
                </div>

                <button
                  className="detail-action"
                  onClick={() => navigate("/admin/map")}
                >
                  View on Map →
                </button>
              </div>

              {/* ISSUE METRICS */}
              <div className="admin-panel detail-card">
                <p>ISSUE METRICS</p>

                <div className="ai-result">
                  <span>Priority Score</span>
                  <strong>{issue.priorityScore ?? 0} / 100</strong>
                </div>

                <div className="ai-result">
                  <span>Total Submissions</span>
                  <strong>{reportCount}</strong>
                </div>

                <div className="ai-result">
                  <span>Issue Status</span>
                  <strong>{statusText}</strong>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default IssueDetails;
