import { useNavigate } from "react-router-dom";

function Reports() {
  const navigate = useNavigate();

  const reports = [
    {
      id: "RW-1048",
      location: "MG Road",
      damage: "Pothole",
      severity: "High",
      status: "Pending",
      date: "25 Aug 2026",
    },
    {
      id: "RW-1047",
      location: "Civil Lines",
      damage: "Road Crack",
      severity: "Medium",
      status: "Assigned",
      date: "25 Aug 2026",
    },
    {
      id: "RW-1046",
      location: "Naini Bridge",
      damage: "Pothole",
      severity: "High",
      status: "In Progress",
      date: "24 Aug 2026",
    },
    {
      id: "RW-1045",
      location: "Station Road",
      damage: "Surface Damage",
      severity: "Low",
      status: "Resolved",
      date: "24 Aug 2026",
    },
    {
      id: "RW-1044",
      location: "Civil Lines",
      damage: "Pothole",
      severity: "High",
      status: "Pending",
      date: "23 Aug 2026",
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
              {reports.length} reports
            </span>
          </div>

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
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <strong>{report.id}</strong>
                    </td>

                    <td>{report.location}</td>

                    <td>{report.damage}</td>

                    <td>
                      <span
                        className={`severity ${report.severity.toLowerCase()}`}
                      >
                        {report.severity}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`status ${report.status
                          .toLowerCase()
                          .replace(" ", "-")}`}
                      >
                        {report.status}
                      </span>
                    </td>

                    <td>{report.date}</td>

                    <td>
                      <button
                        className="view-report-button"
                        onClick={() =>
                          navigate(`/admin/reports/${report.id}`)
                        }
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Reports;