import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getReports } from "../../services/api";

function Dashboard() {
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
      setError(err.message || "Failed to load dashboard data from database.");
    } finally {
      setLoading(false);
    }
  };

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

  const formatReportId = (id) => {
    if (!id) return "RW-0000";
    return `RW-${id.slice(-6).toUpperCase()}`;
  };

  const formatStatus = (status) => {
    if (!status) return "Reported";
    return status
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  // Compute live statistics from MongoDB reports
  const totalReports = reports.length;
  const pendingCount = reports.filter(
    (r) =>
      (r.status || "").toLowerCase() === "reported" ||
      (r.status || "").toLowerCase() === "pending"
  ).length;
  const highPriorityCount = reports.filter(
    (r) =>
      (r.severity || "").toLowerCase() === "high" || (r.priorityScore || 0) >= 70
  ).length;
  const resolvedCount = reports.filter(
    (r) =>
      (r.status || "").toLowerCase() === "completed" ||
      (r.status || "").toLowerCase() === "resolved"
  ).length;
  const resolvedPercent =
    totalReports > 0 ? Math.round((resolvedCount / totalReports) * 100) : 0;
  const maxPriorityScore =
    reports.length > 0 ? Math.max(...reports.map((r) => r.priorityScore || 0)) : 0;

  const stats = [
    {
      label: "Total Reports",
      value: totalReports.toLocaleString(),
      change: `${totalReports} total submitted`,
    },
    {
      label: "Pending",
      value: pendingCount.toLocaleString(),
      change: pendingCount > 0 ? "Needs attention" : "All clear",
    },
    {
      label: "High Priority",
      value: highPriorityCount.toLocaleString(),
      change: highPriorityCount > 0 ? "Urgent response" : "No urgent issues",
    },
    {
      label: "Resolved",
      value: resolvedCount.toLocaleString(),
      change: `${resolvedPercent}% resolved`,
    },
  ];

  const recentReports = reports.slice(0, 4);

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
          <button className="active">Dashboard</button>

          <button onClick={() => navigate("/admin/reports")}>
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
            <h1>Dashboard</h1>
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

        <section className="admin-stats">
          {stats.map((stat) => (
            <div className="admin-stat-card" key={stat.label}>
              <span>{stat.label}</span>
              <strong>{loading ? "..." : stat.value}</strong>
              <small>{stat.change}</small>
            </div>
          ))}
        </section>

        <section className="admin-dashboard-grid">
          <div className="admin-panel reports-panel">
            <div className="admin-panel-header">
              <div>
                <p>RECENT ACTIVITY</p>
                <h2>Latest Reports</h2>
              </div>

              <button onClick={() => navigate("/admin/reports")}>
                View all →
              </button>
            </div>

            {loading ? (
              <div
                style={{
                  padding: "30px",
                  textAlign: "center",
                  color: "#8b9c9f",
                  fontSize: "12px",
                }}
              >
                Loading activity...
              </div>
            ) : recentReports.length === 0 ? (
              <div
                style={{
                  padding: "30px",
                  textAlign: "center",
                  color: "#69777b",
                  fontSize: "12px",
                }}
              >
                No report activity recorded yet.
              </div>
            ) : (
              <div className="admin-report-list">
                {recentReports.map((report) => {
                  const displayId = formatReportId(report._id);
                  const severity = (report.severity || "low").toLowerCase();
                  const status = (report.status || "reported").toLowerCase();

                  return (
                    <div className="admin-report-row" key={report._id || Math.random()}>
                      <div className="report-id">{displayId}</div>

                      <div className="report-info">
                        <strong>{formatDamageType(report.damageType)}</strong>
                        <span>{getLocationText(report)}</span>
                      </div>

                      <span className={`severity ${severity}`}>
                        {severity.toUpperCase()}
                      </span>

                      <span
                        className={`status ${status.replace("_", "-")}`}
                      >
                        {formatStatus(status)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="admin-panel priority-panel">
            <div className="admin-panel-header">
              <div>
                <p>AI PRIORITIZATION</p>
                <h2>Priority Overview</h2>
              </div>
            </div>

            <div className="priority-score">
              <strong>{loading ? "--" : maxPriorityScore}</strong>
              <span>/100</span>
            </div>

            <p className="priority-description">
              Current highest road damage priority requiring fast response.
            </p>

            <div className="priority-bar">
              <span style={{ width: `${loading ? 0 : Math.min(100, maxPriorityScore)}%` }}></span>
            </div>

            <div className="priority-meta">
              <span>High priority reports</span>
              <strong>{loading ? "..." : highPriorityCount}</strong>
            </div>

            <button
              className="priority-button"
              onClick={() => navigate("/admin/reports")}
            >
              Review priority reports →
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;