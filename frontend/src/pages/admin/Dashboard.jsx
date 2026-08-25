import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  const stats = [
    {
      label: "Total Reports",
      value: "1,248",
      change: "+12%",
    },
    {
      label: "Pending",
      value: "186",
      change: "Needs attention",
    },
    {
      label: "High Priority",
      value: "42",
      change: "Urgent",
    },
    {
      label: "Resolved",
      value: "1,020",
      change: "82% resolved",
    },
  ];

  const recentReports = [
    {
      id: "RW-1048",
      location: "MG Road",
      damage: "Pothole",
      severity: "High",
      status: "Pending",
    },
    {
      id: "RW-1047",
      location: "Civil Lines",
      damage: "Road Crack",
      severity: "Medium",
      status: "Assigned",
    },
    {
      id: "RW-1046",
      location: "Naini Bridge",
      damage: "Pothole",
      severity: "High",
      status: "In Progress",
    },
    {
      id: "RW-1045",
      location: "Station Road",
      damage: "Surface Damage",
      severity: "Low",
      status: "Resolved",
    },
  ];

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

        <section className="admin-stats">
          {stats.map((stat) => (
            <div className="admin-stat-card" key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
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

            <div className="admin-report-list">
              {recentReports.map((report) => (
                <div className="admin-report-row" key={report.id}>
                  <div className="report-id">{report.id}</div>

                  <div className="report-info">
                    <strong>{report.damage}</strong>
                    <span>{report.location}</span>
                  </div>

                  <span
                    className={`severity ${report.severity.toLowerCase()}`}
                  >
                    {report.severity}
                  </span>

                  <span
                    className={`status ${report.status
                      .toLowerCase()
                      .replace(" ", "-")}`}
                  >
                    {report.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-panel priority-panel">
            <div className="admin-panel-header">
              <div>
                <p>AI PRIORITIZATION</p>
                <h2>Priority Overview</h2>
              </div>
            </div>

            <div className="priority-score">
              <strong>87</strong>
              <span>/100</span>
            </div>

            <p className="priority-description">
              Current road damage requiring the fastest response.
            </p>

            <div className="priority-bar">
              <span></span>
            </div>

            <div className="priority-meta">
              <span>High priority reports</span>
              <strong>42</strong>
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