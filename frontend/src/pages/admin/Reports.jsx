import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getReports } from "../../services/api";

function Reports() {
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
      setError(err.message || "Failed to load reports from database.");
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
          onClick={() => navigate("/admin/login")}
        >
          Sign out
        </button>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <p>ROADWISE ADMINISTRATION</p>
            <h1>Reports</h1>
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
          <div className="admin-panel-header">
            <div>
              <p>ROAD DAMAGE REPORTS</p>
              <h2>All Reports</h2>
            </div>

            <span className="reports-count">
              {loading ? "Loading..." : `${reports.length} reports`}
            </span>
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
          ) : reports.length === 0 ? (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: "#69777b",
                fontSize: "13px",
              }}
            >
              No road damage reports found in database.
            </div>
          ) : (
            <div className="reports-table-wrapper">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Report</th>
                    <th>Location</th>
                    <th>Damage</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {reports.map((report) => {
                    const displayId = formatReportId(report._id);
                    const severity = (report.severity || "low").toLowerCase();
                    const status = (report.status || "reported").toLowerCase();

                    return (
                      <tr key={report._id || Math.random()}>
                        <td>
                          <strong>{displayId}</strong>
                        </td>

                        <td>{getLocationText(report)}</td>

                        <td>{formatDamageType(report.damageType)}</td>

                        <td>
                          <span className={`severity ${severity}`}>
                            {severity.toUpperCase()}
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

                        <td>
                          <button
                            className="view-report-button"
                            onClick={() =>
                              navigate(`/admin/reports/${report._id}`)
                            }
                          >
                            View →
                          </button>
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
    </div>
  );
}

export default Reports;