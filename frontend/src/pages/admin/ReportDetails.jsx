import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getReports } from "../../services/api";

const SERVER_BASE = "http://localhost:5000";

function ReportDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) {
      fetchReportDetails();
    } else {
      setError("No report ID provided in URL.");
      setLoading(false);
    }
  }, [id]);

  const fetchReportDetails = async () => {
    setLoading(true);
    setError("");
    try {
      const reportsList = await getReports();
      if (Array.isArray(reportsList)) {
        const found = reportsList.find((r) => r._id === id || r.id === id);
        if (found) {
          setReport(found);
        } else {
          setError("Report not found in database.");
        }
      } else {
        setError("Failed to load reports from database.");
      }
    } catch (err) {
      setError(err.message || "Failed to fetch report details.");
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
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatStatus = (status) => {
    if (!status) return "Reported";
    return status
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  // GeoJSON coordinates array: [longitude, latitude]
  const longitude = report?.location?.coordinates?.[0];
  const latitude = report?.location?.coordinates?.[1];
  const addressText = report?.location?.address || "GPS Location Captured";

  const severityText = (report?.severity || "low").toUpperCase();
  const statusText = formatStatus(report?.status);
  const confidenceText =
    typeof report?.confidence === "number"
      ? `${(report.confidence * 100).toFixed(1)}%`
      : "N/A";
  const priorityScoreText = `${report?.priorityScore ?? 0} / 100`;

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

          <button
            className="active"
            onClick={() => navigate("/admin/reports")}
          >
            Reports
          </button>

          <button onClick={() => navigate("/admin/map")}>
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
            <h1>Report Details</h1>
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
          onClick={() => navigate("/admin/reports")}
        >
          ← Back to Reports
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
            Loading report details from database...
          </div>
        ) : error || !report ? (
          <div
            className="admin-panel"
            style={{
              padding: "40px",
              textAlign: "center",
              margin: "20px 0",
            }}
          >
            <h3 style={{ color: "#ff9b9b", marginBottom: "10px" }}>
              ⚠️ {error || "Report Not Found"}
            </h3>
            <p style={{ color: "#718084", fontSize: "12px", marginBottom: "20px" }}>
              No matching road damage report was found for ID: {id}
            </p>
            <button
              className="detail-action"
              style={{ width: "auto", margin: "0 auto", padding: "10px 20px" }}
              onClick={() => navigate("/admin/reports")}
            >
              ← Return to All Reports
            </button>
          </div>
        ) : (
          <section className="report-details-grid">
            <div className="admin-panel report-detail-main">
              <div className="admin-panel-header">
                <div>
                  <p>REPORT ID</p>
                  <h2>{formatReportId(report._id)}</h2>
                </div>

                <span className={`status ${(report.status || "reported").toLowerCase().replace("_", "-")}`}>
                  {statusText}
                </span>
              </div>

              {/* LIVE DAMAGE IMAGE FROM BACKEND */}
              {report.imageUrl ? (
                <div
                  className="damage-image-container"
                  style={{
                    width: "100%",
                    height: "320px",
                    overflow: "hidden",
                    borderRadius: "14px",
                    marginBottom: "24px",
                    border: "1px solid rgba(34, 211, 238, 0.2)",
                    background: "#050b0d",
                  }}
                >
                  <img
                    src={
                      report.imageUrl.startsWith("http")
                        ? report.imageUrl
                        : `${SERVER_BASE}${report.imageUrl}`
                    }
                    alt="Road Damage Evidence"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </div>
              ) : (
                <div className="damage-image-placeholder">
                  <span>ROAD DAMAGE IMAGE</span>
                  <strong>Image not available</strong>
                  <small>Citizen submitted evidence</small>
                </div>
              )}

              <div className="report-description">
                <p>DESCRIPTION</p>
                <h3>Citizen observation</h3>
                <span>
                  {report.description && report.description.trim()
                    ? report.description
                    : "No citizen description provided for this report."}
                </span>
              </div>
            </div>

            <div className="report-detail-side">
              {/* AI ANALYSIS */}
              <div className="admin-panel detail-card">
                <p>AI ANALYSIS</p>

                <div className="ai-result">
                  <span>Detected damage</span>
                  <strong>{formatDamageType(report.damageType)}</strong>
                </div>

                <div className="ai-result">
                  <span>Severity</span>
                  <strong
                    style={{
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

                <div className="ai-result">
                  <span>AI Confidence</span>
                  <strong>{confidenceText}</strong>
                </div>

                <div className="ai-result">
                  <span>Priority score</span>
                  <strong>{priorityScoreText}</strong>
                </div>
              </div>

              {/* LOCATION */}
              <div className="admin-panel detail-card">
                <p>LOCATION</p>

                <div className="location-details">
                  <strong>{addressText}</strong>

                  <span>
                    Latitude: {typeof latitude === "number" ? latitude.toFixed(5) : "N/A"}
                    <br />
                    Longitude: {typeof longitude === "number" ? longitude.toFixed(5) : "N/A"}
                  </span>
                </div>

                <button
                  className="detail-action"
                  onClick={() => navigate("/admin/map")}
                >
                  View on map →
                </button>

                {typeof latitude === "number" &&
                  typeof longitude === "number" &&
                  (latitude !== 0 || longitude !== 0) && (
                    <a
                      href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="detail-action"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        marginTop: "8px",
                        textDecoration: "none",
                        background: "rgba(34, 211, 238, 0.12)",
                        color: "#22d3ee",
                        border: "1px solid rgba(34, 211, 238, 0.3)",
                        borderRadius: "8px",
                        padding: "10px 14px",
                        fontSize: "12px",
                        fontWeight: "600",
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    >
                      📍 Open in Google Maps ↗
                    </a>
                  )}
              </div>

              {/* REPORT INFORMATION */}
              <div className="admin-panel detail-card">
                <p>REPORT INFORMATION</p>

                <div className="info-row">
                  <span>Reported</span>
                  <strong>{formatDate(report.createdAt)}</strong>
                </div>

                <div className="info-row">
                  <span>Current status</span>
                  <strong>{statusText}</strong>
                </div>

                <div className="info-row">
                  <span>Database ID</span>
                  <strong style={{ fontSize: "10px", wordBreak: "break-all" }}>
                    {report._id}
                  </strong>
                </div>
              </div>

              {/* REPAIR ASSIGNMENT */}
              <div className="admin-panel detail-card">
                <p>REPAIR ASSIGNMENT</p>

                <div className="assignment-info">
                  <span>Suggested team</span>
                  <strong>Road Maintenance Team A</strong>
                </div>

                <div className="assignment-info">
                  <span>Estimated response</span>
                  <strong>Within 24 hours</strong>
                </div>

                <button
                  className="detail-action"
                  onClick={() =>
                    alert(
                      "Team assignment will be connected to the backend.",
                    )
                  }
                >
                  View available teams →
                </button>
              </div>

              {/* MANAGE REPORT */}
              <div className="admin-panel detail-card">
                <p>MANAGE REPORT</p>

                <div className="admin-action-group">
                  <button
                    className="admin-action primary"
                    onClick={() =>
                      alert(
                        "Repair team assignment will be connected to the backend.",
                      )
                    }
                  >
                    Assign Repair Team
                  </button>

                  <button className="admin-action">
                    Mark In Progress
                  </button>

                  <button className="admin-action success">
                    Mark Resolved
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default ReportDetails;