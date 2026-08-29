import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getReports, logoutAdmin } from "../../services/api";
import WorkOrderModal from "../../components/admin/WorkOrderModal";

function Reports() {
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("ALL"); // 'ALL' | 'CRITICAL' | 'PENDING' | 'RESOLVED'
  const [selectedWorkOrderReport, setSelectedWorkOrderReport] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadReports = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getReports();
        if (isMounted) {
          setReports(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load reports from database.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadReports();

    return () => {
      isMounted = false;
    };
  }, []);

  const formatDamageType = (type) => {
    if (!type) return "Other";
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getLocationText = (report) => {
    if (report.location?.address && report.location.address.trim()) {
      return report.location.address;
    }
    if (
      report.location?.coordinates &&
      Array.isArray(report.location.coordinates)
    ) {
      const [lng, lat] = report.location.coordinates;
      if (lat !== 0 || lng !== 0) {
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }
    }
    return "GPS Coordinates Captured";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatStatus = (status) => {
    if (!status) return "Reported";
    return status
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const formatReportId = (id) => {
    if (!id) return "RW-0000";
    return `RW-${id.slice(-6).toUpperCase()}`;
  };

  // Helper: Combined Urgency Calculation (Severity + Priority Score combined)
  const getCombinedUrgencyScore = (report) => {
    const sev = (report.severity || "low").toLowerCase();
    const severityWeight = sev === "high" ? 300 : sev === "medium" ? 200 : 100;
    const priority = report.priorityScore || 0;
    return severityWeight + priority;
  };

  // Counts for tabs
  const criticalCount = useMemo(() => {
    return reports.filter(
      (r) =>
        (r.severity || "").toLowerCase() === "high" || (r.priorityScore || 0) >= 70
    ).length;
  }, [reports]);

  const pendingCount = useMemo(() => {
    return reports.filter(
      (r) =>
        (r.status || "").toLowerCase() === "reported" ||
        (r.status || "").toLowerCase() === "in_progress" ||
        (r.status || "").toLowerCase() === "pending"
    ).length;
  }, [reports]);

  const resolvedCount = useMemo(() => {
    return reports.filter(
      (r) =>
        (r.status || "").toLowerCase() === "completed" ||
        (r.status || "").toLowerCase() === "resolved"
    ).length;
  }, [reports]);

  // Clean Filtered & Auto-Sorted Dataset
  const filteredReports = useMemo(() => {
    const list = reports.filter((report) => {
      // Search filter
      const matchSearch =
        searchTerm === "" ||
        (report._id && formatReportId(report._id).toLowerCase().includes(searchTerm.toLowerCase())) ||
        (report.damageType && report.damageType.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (report.location?.address && report.location.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (report.citizenName && report.citizenName.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchSearch) return false;

      // Tab filter
      if (activeTab === "CRITICAL") {
        const isHighSev = (report.severity || "").toLowerCase() === "high";
        const isHighPriority = (report.priorityScore || 0) >= 70;
        return isHighSev || isHighPriority;
      }
      if (activeTab === "PENDING") {
        const st = (report.status || "").toLowerCase();
        return st === "reported" || st === "in_progress" || st === "pending";
      }
      if (activeTab === "RESOLVED") {
        const st = (report.status || "").toLowerCase();
        return st === "completed" || st === "resolved";
      }
      return true; // 'ALL'
    });

    // Auto-sort: When Critical tab or by default, sort by combined urgency (Highest Severity + Priority first)
    list.sort((a, b) => {
      const urgencyA = getCombinedUrgencyScore(a);
      const urgencyB = getCombinedUrgencyScore(b);
      if (urgencyB !== urgencyA) {
        return urgencyB - urgencyA;
      }
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    return list;
  }, [reports, searchTerm, activeTab]);

  // CSV Export
  const handleExportCSV = () => {
    if (!filteredReports || filteredReports.length === 0) return;

    const headers = [
      "Ticket ID",
      "Damage Type",
      "Severity",
      "Priority Score",
      "Status",
      "Latitude",
      "Longitude",
      "Address",
      "Citizen Name",
      "Citizen Contact",
      "Reported Date",
    ];

    const rows = filteredReports.map((r) => [
      formatReportId(r._id),
      formatDamageType(r.damageType),
      (r.severity || "LOW").toUpperCase(),
      r.priorityScore || 0,
      formatStatus(r.status),
      r.location?.coordinates?.[1] || "",
      r.location?.coordinates?.[0] || "",
      `"${(r.location?.address || "").replace(/"/g, '""')}"`,
      `"${(r.citizenName || "").replace(/"/g, '""')}"`,
      `"${(r.citizenContact || "").replace(/"/g, '""')}"`,
      new Date(r.createdAt || Date.now()).toISOString(),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `roadwise_municipal_reports_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

          <button className="active">Reports</button>

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
            <h1>Reports Management</h1>
          </div>

          <div className="admin-user">
            <div className="admin-user-avatar">A</div>

            <div>
              <strong>Administrator</strong>
              <span>Road Authority</span>
            </div>
          </div>
        </header>

        <section className="admin-panel reports-page-panel">
          {/* Header Row */}
          <div
            className="admin-panel-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <p>ROAD DAMAGE INCIDENTS</p>
              <h2>Incident Reports</h2>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={filteredReports.length === 0}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 14px",
                  borderRadius: "8px",
                  background: "rgba(34, 211, 238, 0.15)",
                  border: "1px solid rgba(34, 211, 238, 0.35)",
                  color: "#22d3ee",
                  fontSize: "12px",
                  fontWeight: "800",
                  cursor: filteredReports.length === 0 ? "not-allowed" : "pointer",
                }}
              >
                <span>📊</span> Export CSV
              </button>

              <span className="reports-count">
                {loading ? "Loading..." : `${filteredReports.length} reports`}
              </span>
            </div>
          </div>

          {/* Clean Simplified Tab & Search Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "14px",
              padding: "0 20px 18px",
              flexWrap: "wrap",
            }}
          >
            {/* 4 Clean Action Tabs */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setActiveTab("ALL")}
                style={{
                  padding: "7px 14px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  background: activeTab === "ALL" ? "#22d3ee" : "rgba(255, 255, 255, 0.04)",
                  color: activeTab === "ALL" ? "#080e10" : "#8b9c9f",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                All Reports ({reports.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("CRITICAL")}
                style={{
                  padding: "7px 14px",
                  borderRadius: "8px",
                  border: `1px solid ${activeTab === "CRITICAL" ? "#ff4d4d" : "rgba(255, 77, 77, 0.3)"}`,
                  background: activeTab === "CRITICAL" ? "#ff4d4d" : "rgba(255, 77, 77, 0.12)",
                  color: activeTab === "CRITICAL" ? "#ffffff" : "#ff8080",
                  fontSize: "12px",
                  fontWeight: "800",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  transition: "all 0.2s ease",
                }}
              >
                <span>🔥</span> Critical & Urgent ({criticalCount})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("PENDING")}
                style={{
                  padding: "7px 14px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  background: activeTab === "PENDING" ? "rgba(34, 211, 238, 0.25)" : "rgba(255, 255, 255, 0.04)",
                  color: activeTab === "PENDING" ? "#22d3ee" : "#8b9c9f",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                Pending / In Progress ({pendingCount})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("RESOLVED")}
                style={{
                  padding: "7px 14px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  background: activeTab === "RESOLVED" ? "#10b981" : "rgba(255, 255, 255, 0.04)",
                  color: activeTab === "RESOLVED" ? "#080e10" : "#8b9c9f",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                Resolved ({resolvedCount})
              </button>
            </div>

            {/* Simple Search Input */}
            <div style={{ flex: 1, minWidth: "220px", maxWidth: "340px" }}>
              <input
                type="text"
                placeholder="🔍 Search ticket, location, citizen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  background: "rgba(10, 18, 22, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#f0f6f8",
                  fontSize: "12px",
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {loading ? (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: "#8b9c9f",
                fontSize: "13px",
              }}
            >
              Loading reports from database...
            </div>
          ) : error ? (
            <div
              style={{
                padding: "20px",
                margin: "20px",
                color: "#ff9b9b",
                background: "rgba(255, 70, 70, 0.08)",
                borderRadius: "10px",
                border: "1px solid rgba(255, 70, 70, 0.2)",
                fontSize: "12px",
              }}
            >
              ⚠️ {error}
            </div>
          ) : filteredReports.length === 0 ? (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: "#69777b",
                fontSize: "13px",
              }}
            >
              No road damage reports match your current filter.
            </div>
          ) : (
            <div className="reports-table-wrapper">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Report ID</th>
                    <th>Location</th>
                    <th>Damage</th>
                    <th>Severity</th>
                    <th>Priority Score</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredReports.map((report, index) => {
                    const displayId = formatReportId(report._id);
                    const severity = (report.severity || "low").toLowerCase();
                    const status = (report.status || "reported").toLowerCase();
                    const score = report.priorityScore || 0;

                    const scoreColor =
                      score >= 70 ? "#ff4d4d" : score >= 40 ? "#ffaa00" : "#22d3ee";
                    const scoreBg =
                      score >= 70
                        ? "rgba(255, 77, 77, 0.15)"
                        : score >= 40
                        ? "rgba(255, 170, 0, 0.15)"
                        : "rgba(34, 211, 238, 0.15)";

                    return (
                      <tr key={report._id || `report-${index}`}>
                        <td>
                          <strong style={{ color: "#22d3ee" }}>{displayId}</strong>
                        </td>

                        <td>{getLocationText(report)}</td>

                        <td>{formatDamageType(report.damageType)}</td>

                        <td>
                          <span className={`severity ${severity}`}>
                            {severity.toUpperCase()}
                          </span>
                        </td>

                        {/* Priority Score with Visual Urgency Pill */}
                        <td>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: "800",
                              background: scoreBg,
                              color: scoreColor,
                              border: `1px solid ${scoreColor}40`,
                            }}
                          >
                            {score >= 70 ? "🔥 " : ""}{score} / 100
                          </span>
                        </td>

                        <td>
                          <span
                            className={`status ${status.replace("_", "-")}`}
                          >
                            {formatStatus(status)}
                          </span>
                        </td>

                        <td>{formatDate(report.createdAt)}</td>

                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            {/* 1-Click Work Order PDF */}
                            <button
                              type="button"
                              onClick={() => setSelectedWorkOrderReport(report)}
                              style={{
                                background: "rgba(255, 255, 255, 0.06)",
                                border: "1px solid rgba(255, 255, 255, 0.12)",
                                color: "#f0f6f8",
                                padding: "5px 9px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: "700",
                                cursor: "pointer",
                              }}
                            >
                              📄 Work Order
                            </button>

                            <button
                              className="view-report-button"
                              onClick={() =>
                                navigate(`/admin/reports/${report._id}`)
                              }
                            >
                              View →
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Render Work Order Modal */}
      {selectedWorkOrderReport && (
        <WorkOrderModal
          report={selectedWorkOrderReport}
          onClose={() => setSelectedWorkOrderReport(null)}
        />
      )}
    </div>
  );
}

export default Reports;