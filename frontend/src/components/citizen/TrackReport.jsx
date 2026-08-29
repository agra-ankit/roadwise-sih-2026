import { useState } from "react";
import { trackReport, SERVER_BASE_URL } from "../../services/api";
import BeforeAfterSlider from "../common/BeforeAfterSlider";

function TrackReport() {
  const [ticketQuery, setTicketQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [trackResult, setTrackResult] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!ticketQuery.trim()) {
      setError("Please enter a valid Report ID or Ticket Code.");
      return;
    }

    setLoading(true);
    setError("");
    setTrackResult(null);

    try {
      const data = await trackReport(ticketQuery.trim());
      if (data && data.report) {
        setTrackResult(data);
      } else {
        setError(`No active report found matching "${ticketQuery.trim()}"`);
      }
    } catch (err) {
      setError(err.message || "Failed to find report. Check ticket ID.");
    } finally {
      setLoading(false);
    }
  };

  const formatReportId = (rawId) => {
    if (!rawId) return "RW-0000";
    return `RW-${rawId.slice(-6).toUpperCase()}`;
  };

  const formatDamageType = (type) => {
    if (!type) return "Road Damage";
    return type
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const getImageUrl = (relUrl) => {
    if (!relUrl) return null;
    return relUrl.startsWith("http") ? relUrl : `${SERVER_BASE_URL}${relUrl}`;
  };

  const getStatusStepIndex = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "reported") return 1;
    if (s === "assigned") return 2;
    if (s === "in_progress") return 3;
    if (s === "completed" || s === "verified") return 4;
    return 1;
  };

  const report = trackResult?.report;
  const statusStep = report ? getStatusStepIndex(report.status) : 0;
  const beforeImg = report ? getImageUrl(report.imageUrl) : null;
  const afterImg = report ? getImageUrl(report.completionImageUrl) : null;

  const lat = report?.location?.coordinates?.[1];
  const lng = report?.location?.coordinates?.[0];

  return (
    <section className="track-section" id="track">
      <div className="track-container">
        <div className="section-heading" style={{ textAlign: "center", marginBottom: "36px", width: "100%" }}>
          <div className="mini-label" style={{ color: "#22d3ee", fontSize: "11px", fontWeight: "800", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "8px" }}>
            LIVE CITIZEN TRACKING
          </div>

          <h2 style={{ fontSize: "32px", color: "#f0f6f8", margin: "0 0 12px 0" }}>
            Track Your <span style={{ color: "#22d3ee" }}>Road Report Status</span>
          </h2>

          <p style={{ color: "#8b9c9f", fontSize: "14px", maxWidth: "600px", margin: "0 auto" }}>
            Enter your 6-character Ticket Code (e.g. <strong>RW-8A2F1C</strong>) or database ID to see real-time repair progress and verification proof.
          </p>
        </div>

        <div style={{ width: "100%", maxWidth: "560px", margin: "0 auto 32px" }}>
          <form onSubmit={handleSearch} style={{ display: "flex", gap: "10px", width: "100%" }}>
            <input
              type="text"
              placeholder="Enter Ticket Code (e.g. RW-7A2B3C)..."
              value={ticketQuery}
              onChange={(e) => setTicketQuery(e.target.value)}
              style={{
                flex: 1,
                padding: "14px 18px",
                background: "#080e10",
                border: "1px solid rgba(34, 211, 238, 0.3)",
                borderRadius: "10px",
                color: "#f0f6f8",
                fontSize: "14px",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "14px 24px",
                background: "#22d3ee",
                color: "#080e10",
                border: 0,
                borderRadius: "10px",
                fontWeight: "800",
                fontSize: "14px",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 0 14px rgba(34, 211, 238, 0.3)",
              }}
            >
              {loading ? "Searching..." : "Track →"}
            </button>
          </form>

          {error && (
            <div style={{ marginTop: "14px", padding: "12px", background: "rgba(255, 70, 70, 0.1)", border: "1px solid rgba(255, 70, 70, 0.3)", borderRadius: "8px", color: "#ff9b9b", fontSize: "12px", textAlign: "center" }}>
              ⚠ {error}
            </div>
          )}
        </div>

        {report && (
          <div
            className="track-card"
            style={{
              width: "100%",
              background: "#080e10",
              border: "1px solid rgba(34, 211, 238, 0.2)",
              borderRadius: "18px",
              padding: "28px",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
              textAlign: "left",
            }}
          >
          {/* Header Row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px", paddingBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div>
              <div style={{ fontSize: "11px", color: "#8b9c9f", fontWeight: "700", textTransform: "uppercase" }}>TICKET ID</div>
              <h3 style={{ fontSize: "24px", color: "#22d3ee", margin: "2px 0 6px" }}>{formatReportId(report._id)}</h3>
              <span style={{ fontSize: "13px", color: "#f0f6f8" }}>{formatDamageType(report.damageType)}</span>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <span
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: "800",
                  textTransform: "uppercase",
                  background:
                    report.severity === "high"
                      ? "rgba(255, 77, 77, 0.15)"
                      : report.severity === "medium"
                      ? "rgba(255, 170, 0, 0.15)"
                      : "rgba(34, 211, 238, 0.15)",
                  color:
                    report.severity === "high"
                      ? "#ff4d4d"
                      : report.severity === "medium"
                      ? "#ffaa00"
                      : "#22d3ee",
                  border: `1px solid ${
                    report.severity === "high"
                      ? "rgba(255, 77, 77, 0.3)"
                      : report.severity === "medium"
                      ? "rgba(255, 170, 0, 0.3)"
                      : "rgba(34, 211, 238, 0.3)"
                  }`,
                }}
              >
                Severity: {report.severity}
              </span>

              <span
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: "800",
                  textTransform: "uppercase",
                  background:
                    report.status === "completed" || report.status === "verified"
                      ? "rgba(16, 185, 129, 0.15)"
                      : "rgba(34, 211, 238, 0.15)",
                  color:
                    report.status === "completed" || report.status === "verified"
                      ? "#10b981"
                      : "#22d3ee",
                  border: `1px solid ${
                    report.status === "completed" || report.status === "verified"
                      ? "rgba(16, 185, 129, 0.3)"
                      : "rgba(34, 211, 238, 0.3)"
                  }`,
                }}
              >
                Status: {report.status?.replace("_", " ")}
              </span>
            </div>
          </div>

          {/* Context Tags */}
          {report.contextTags && report.contextTags.length > 0 && (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: "16px 0 10px" }}>
              {report.contextTags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    background: "rgba(234, 179, 8, 0.12)",
                    color: "#facc15",
                    border: "1px solid rgba(234, 179, 8, 0.3)",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: "700",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Stepper Timeline */}
          <div style={{ margin: "28px 0" }}>
            <div style={{ fontSize: "11px", color: "#8b9c9f", fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "16px" }}>
              MUNICIPAL REPAIR TIMELINE
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
              {[
                { title: "Reported", desc: "Citizen submission" },
                { title: "AI Analyzed", desc: "Severity calculated" },
                { title: "Assigned", desc: "Team dispatched" },
                { title: "In Progress", desc: "Road repair underway" },
                { title: "Verified", desc: "Fixed & approved" },
              ].map((step, idx) => {
                const isPassed = idx <= statusStep;
                const isCurrent = idx === statusStep;

                return (
                  <div
                    key={step.title}
                    style={{
                      padding: "12px",
                      borderRadius: "10px",
                      background: isCurrent ? "rgba(34, 211, 238, 0.12)" : isPassed ? "rgba(16, 185, 129, 0.08)" : "#050b0d",
                      border: isCurrent ? "1px solid #22d3ee" : isPassed ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <span style={{ fontSize: "12px", color: isPassed ? (isCurrent ? "#22d3ee" : "#10b981") : "#647478" }}>
                        {isPassed ? "✓" : "○"}
                      </span>
                      <strong style={{ fontSize: "12px", color: isPassed ? "#f0f6f8" : "#647478" }}>
                        {step.title}
                      </strong>
                    </div>
                    <span style={{ fontSize: "10px", color: "#8b9c9f", display: "block" }}>{step.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Location & Details Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", margin: "20px 0" }}>
            <div style={{ background: "#050b0d", padding: "14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: "10px", color: "#8b9c9f", textTransform: "uppercase" }}>LOCATION</span>
              <strong style={{ display: "block", fontSize: "13px", color: "#f0f6f8", margin: "4px 0" }}>
                {report.location?.address || "GPS Location Captured"}
              </strong>
              {lat && lng && (
                <a
                  href={`https://www.google.com/maps?q=${lat},${lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "11px", color: "#22d3ee", textDecoration: "none", fontWeight: "700" }}
                >
                  📍 Open in Google Maps ↗
                </a>
              )}
            </div>

            <div style={{ background: "#050b0d", padding: "14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: "10px", color: "#8b9c9f", textTransform: "uppercase" }}>AI METRICS</span>
              <strong style={{ display: "block", fontSize: "13px", color: "#f0f6f8", margin: "4px 0" }}>
                Priority Score: {report.priorityScore} / 100
              </strong>
              <span style={{ fontSize: "11px", color: "#8b9c9f" }}>
                Confidence: {(report.confidence * 100).toFixed(0)}% · Accuracy: ~{Math.round(report.locationAccuracy || 8)}m
              </span>
            </div>
          </div>

          {/* Before & After Proof */}
          <BeforeAfterSlider
            beforeImage={beforeImg}
            afterImage={afterImg}
            beforeLabel="Original Defect (Reported)"
            afterLabel="Repaired Road Surface"
          />
        </div>
      )}
      </div>
    </section>
  );
}

export default TrackReport;
