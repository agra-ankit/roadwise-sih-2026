import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getReportById,
  getReports,
  updateReportStatus,
  completeReport,
  logoutAdmin,
  SERVER_BASE_URL,
} from "../../services/api";
import BeforeAfterSlider from "../../components/common/BeforeAfterSlider";
import AssignTeamModal from "../../components/admin/AssignTeamModal";
import SLATimer from "../../components/admin/SLATimer";
import WorkOrderModal from "../../components/admin/WorkOrderModal";

const SERVER_BASE = SERVER_BASE_URL;

function ReportDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionFile, setCompletionFile] = useState(null);
  const [completionPreview, setCompletionPreview] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadReportData = async () => {
      if (!id) {
        if (isMounted) {
          setError("No report ID provided in URL.");
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError("");
      try {
        const data = await getReportById(id);
        if (isMounted) {
          if (data && (data._id || data.id)) {
            setReport(data);
          } else {
            throw new Error("Report not found");
          }
        }
      } catch (primaryErr) {
        // Graceful fallback: Search in full reports list
        try {
          const reportsList = await getReports();
          if (isMounted && Array.isArray(reportsList)) {
            const found = reportsList.find((r) => r._id === id || r.id === id);
            if (found) {
              setReport(found);
              return;
            }
          }
        } catch {
          // Ignore secondary error
        }

        if (isMounted) {
          setError(primaryErr.message || "Failed to fetch report details from database.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadReportData();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    if (!report?._id) return;
    setActionLoading(true);
    try {
      const updated = await updateReportStatus(report._id, newStatus);
      if (updated && updated.report) {
        setReport(updated.report);
      } else {
        setReport((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      alert(err.message || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteWithProof = async (e) => {
    e.preventDefault();
    if (!completionFile) {
      alert("Please choose an after-repair completion photo");
      return;
    }

    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", completionFile);
      const res = await completeReport(report._id, formData);
      if (res && res.report) {
        setReport(res.report);
        setShowCompleteModal(false);
      }
    } catch (err) {
      alert(err.message || "Failed to upload repair proof");
    } finally {
      setActionLoading(false);
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

  const formatDate = (isoString) => {
    if (!isoString) return "Recent";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Recent";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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

  const beforeImg = report?.imageUrl
    ? report.imageUrl.startsWith("http")
      ? report.imageUrl
      : `${SERVER_BASE}${report.imageUrl}`
    : null;

  const afterImg = report?.completionImageUrl
    ? report.completionImageUrl.startsWith("http")
      ? report.completionImageUrl
      : `${SERVER_BASE}${report.completionImageUrl}`
    : null;

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

                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <SLATimer
                    createdAt={report.createdAt}
                    targetDeadline={report.targetDeadline}
                    slaHours={report.slaHours || 24}
                    status={report.status}
                    severity={report.severity}
                  />

                  <span className={`status ${(report.status || "reported").toLowerCase().replace("_", "-")}`}>
                    {statusText}
                  </span>
                </div>
              </div>

              {/* BEFORE & AFTER SLIDER OR SINGLE DAMAGE IMAGE */}
              {afterImg ? (
                <BeforeAfterSlider
                  beforeImage={beforeImg}
                  afterImage={afterImg}
                  beforeLabel="Before (Reported Defect)"
                  afterLabel="After (Completed Repair)"
                />
              ) : beforeImg ? (
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
                    src={beforeImg}
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
              {/* AI ANALYSIS & CONTEXT TAGS */}
              <div className="admin-panel detail-card">
                <p>AI ANALYSIS & NLP CONTEXT</p>

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
                  <strong style={{ color: "#22d3ee" }}>{priorityScoreText}</strong>
                </div>

                {report.contextTags && report.contextTags.length > 0 && (
                  <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {report.contextTags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          background: "rgba(234, 179, 8, 0.12)",
                          color: "#facc15",
                          border: "1px solid rgba(234, 179, 8, 0.3)",
                          padding: "3px 8px",
                          borderRadius: "5px",
                          fontSize: "10px",
                          fontWeight: "700",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
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
                    <br />
                    Accuracy radius: {typeof report?.locationAccuracy === "number" ? `±${Math.round(report.locationAccuracy)}m` : "High"}
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
                  <span>Assigned Crew</span>
                  <strong style={{ color: "#22d3ee" }}>
                    {report.assignedTeam || "Not assigned yet"}
                  </strong>
                </div>

                {report.targetDeadline && (
                  <div className="info-row">
                    <span>Target Deadline</span>
                    <strong>{formatDate(report.targetDeadline)}</strong>
                  </div>
                )}

                <div className="info-row">
                  <span>Database ID</span>
                  <strong style={{ fontSize: "10px", wordBreak: "break-all" }}>
                    {report._id}
                  </strong>
                </div>
              </div>

              {/* MANAGE REPORT WORKFLOW */}
              <div className="admin-panel detail-card">
                <p>MANAGE WORK ORDER</p>

                <div className="admin-action-group">
                  <button
                    className="admin-action primary"
                    disabled={actionLoading}
                    onClick={() => setShowAssignModal(true)}
                  >
                    🚜 Assign Repair Team
                  </button>

                  <button
                    className="admin-action"
                    style={{
                      background: "rgba(34, 211, 238, 0.12)",
                      color: "#22d3ee",
                      border: "1px solid rgba(34, 211, 238, 0.3)",
                      fontWeight: "700",
                    }}
                    onClick={() => setShowWorkOrderModal(true)}
                  >
                    📄 Generate Work Order PDF
                  </button>

                  <button
                    className="admin-action"
                    disabled={actionLoading}
                    onClick={() => handleStatusChange("in_progress")}
                  >
                    Mark In Progress
                  </button>

                  <button
                    className="admin-action success"
                    disabled={actionLoading}
                    onClick={() => setShowCompleteModal(true)}
                  >
                    Upload Repair Proof & Complete
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Modal for Repair Team Assignment */}
        {showAssignModal && (
          <AssignTeamModal
            reportId={report._id}
            currentTeam={report.assignedTeam}
            onClose={() => setShowAssignModal(false)}
            onAssigned={(updatedData) => {
              setReport((prev) => ({
                ...prev,
                ...updatedData,
              }));
            }}
          />
        )}

        {/* Modal for Municipal Work Order PDF Generator */}
        {showWorkOrderModal && (
          <WorkOrderModal
            report={report}
            onClose={() => setShowWorkOrderModal(false)}
          />
        )}

        {/* Modal for repair proof upload */}
        {showCompleteModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: "20px",
            }}
          >
            <div
              style={{
                background: "#080e10",
                border: "1px solid rgba(34, 211, 238, 0.3)",
                borderRadius: "16px",
                padding: "24px",
                maxWidth: "480px",
                width: "100%",
              }}
            >
              <h3 style={{ margin: "0 0 8px 0", color: "#22d3ee" }}>Upload Repair Completion Proof</h3>
              <p style={{ fontSize: "12px", color: "#8b9c9f", margin: "0 0 16px 0" }}>
                Attach an after-repair photo showing the fixed road surface.
              </p>

              <form onSubmit={handleCompleteWithProof}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files[0];
                    if (f) {
                      setCompletionFile(f);
                      setCompletionPreview(URL.createObjectURL(f));
                    }
                  }}
                  style={{ marginBottom: "14px", color: "#f0f6f8" }}
                />

                {completionPreview && (
                  <img
                    src={completionPreview}
                    alt="Repair Preview"
                    style={{ width: "100%", height: "160px", objectFit: "cover", borderRadius: "8px", marginBottom: "14px" }}
                  />
                )}

                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => setShowCompleteModal(false)}
                    style={{
                      padding: "8px 16px",
                      background: "transparent",
                      color: "#8b9c9f",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    style={{
                      padding: "8px 16px",
                      background: "#10b981",
                      color: "#fff",
                      border: 0,
                      borderRadius: "8px",
                      fontWeight: "700",
                      cursor: actionLoading ? "not-allowed" : "pointer",
                    }}
                  >
                    {actionLoading ? "Submitting..." : "Save & Complete"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default ReportDetails;