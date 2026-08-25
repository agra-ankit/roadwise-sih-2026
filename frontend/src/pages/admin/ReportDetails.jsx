import { useNavigate, useParams } from "react-router-dom";

function ReportDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const report = {
    id: id || "RW-1048",
    location: "MG Road",
    damage: "Pothole",
    severity: "High",
    status: "Pending",
    reportedAt: "25 Aug 2026, 10:42 AM",
    description:
      "Large pothole near the main intersection. Traffic is affected and the damaged section may be unsafe for two-wheelers.",
    latitude: "25.4358",
    longitude: "81.8463",
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

        <section className="report-details-grid">
          <div className="admin-panel report-detail-main">
            <div className="admin-panel-header">
              <div>
                <p>REPORT ID</p>
                <h2>{report.id}</h2>
              </div>

              <span className={`status ${report.status.toLowerCase()}`}>
                {report.status}
              </span>
            </div>

            <div className="damage-image-placeholder">
              <span>ROAD DAMAGE IMAGE</span>
              <strong>Image will appear here</strong>
              <small>Citizen submitted evidence</small>
            </div>

            <div className="report-description">
              <p>DESCRIPTION</p>
              <h3>Citizen observation</h3>
              <span>{report.description}</span>
            </div>
          </div>

          <div className="report-detail-side">
            {/* AI ANALYSIS */}
            <div className="admin-panel detail-card">
              <p>AI ANALYSIS</p>

              <div className="ai-result">
                <span>Detected damage</span>
                <strong>{report.damage}</strong>
              </div>

              <div className="ai-result">
                <span>Severity</span>
                <strong className="high-text">{report.severity}</strong>
              </div>

              <div className="ai-result">
                <span>Priority score</span>
                <strong>87 / 100</strong>
              </div>
            </div>

            {/* LOCATION */}
            <div className="admin-panel detail-card">
              <p>LOCATION</p>

              <div className="location-details">
                <strong>{report.location}</strong>

                <span>
                  {report.latitude}, {report.longitude}
                </span>
              </div>

              <button
                className="detail-action"
                onClick={() => navigate("/admin/map")}
              >
                View on map →
              </button>
            </div>

            {/* REPORT INFORMATION */}
            <div className="admin-panel detail-card">
              <p>REPORT INFORMATION</p>

              <div className="info-row">
                <span>Reported</span>
                <strong>{report.reportedAt}</strong>
              </div>

              <div className="info-row">
                <span>Current status</span>
                <strong>{report.status}</strong>
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
      </main>
    </div>
  );
}

export default ReportDetails;