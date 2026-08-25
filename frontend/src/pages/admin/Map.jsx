import { useNavigate } from "react-router-dom";

function Map() {
  const navigate = useNavigate();

  const reports = [
    {
      id: "RW-1048",
      location: "MG Road",
      damage: "Pothole",
      severity: "High",
      top: "28%",
      left: "58%",
    },
    {
      id: "RW-1047",
      location: "Civil Lines",
      damage: "Road Crack",
      severity: "Medium",
      top: "45%",
      left: "35%",
    },
    {
      id: "RW-1046",
      location: "Naini Bridge",
      damage: "Pothole",
      severity: "High",
      top: "65%",
      left: "70%",
    },
    {
      id: "RW-1045",
      location: "Station Road",
      damage: "Surface Damage",
      severity: "Low",
      top: "72%",
      left: "30%",
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

          <button onClick={() => navigate("/admin/reports")}>
            Reports
          </button>

          <button className="active">Road Map</button>
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
            <h1>Road Damage Map</h1>
          </div>

          <div className="admin-user">
            <div className="admin-user-avatar">A</div>

            <div>
              <strong>Administrator</strong>
              <span>Road Authority</span>
            </div>
          </div>
        </header>

        <section className="map-layout">
          <div className="admin-panel map-panel">
            <div className="map-header">
              <div>
                <p>LIVE REPORT LOCATIONS</p>
                <h2>Damage Overview</h2>
              </div>

              <div className="map-legend">
                <span>
                  <i className="legend-dot high-dot"></i>
                  High
                </span>

                <span>
                  <i className="legend-dot medium-dot"></i>
                  Medium
                </span>

                <span>
                  <i className="legend-dot low-dot"></i>
                  Low
                </span>
              </div>
            </div>

            <div className="road-map">
              <div className="map-road road-one"></div>
              <div className="map-road road-two"></div>
              <div className="map-road road-three"></div>
              <div className="map-road road-four"></div>

              {reports.map((report) => (
                <button
                  key={report.id}
                  className={`map-marker ${report.severity.toLowerCase()}`}
                  style={{
                    top: report.top,
                    left: report.left,
                  }}
                  title={`${report.id} - ${report.location}`}
                  onClick={() =>
                    navigate(`/admin/reports/${report.id}`)
                  }
                >
                  <span></span>
                </button>
              ))}

              <div className="map-label label-one">MG Road</div>
              <div className="map-label label-two">Civil Lines</div>
              <div className="map-label label-three">Naini</div>
              <div className="map-label label-four">Station Road</div>

              <div className="map-placeholder-text">
                ROADWISE
                <span>MAP VIEW</span>
              </div>
            </div>
          </div>

          <div className="admin-panel map-reports">
            <div className="admin-panel-header">
              <div>
                <p>LOCATIONS</p>
                <h2>Reported Issues</h2>
              </div>
            </div>

            <div className="map-report-list">
              {reports.map((report) => (
                <button
                  className="map-report-item"
                  key={report.id}
                  onClick={() =>
                    navigate(`/admin/reports/${report.id}`)
                  }
                >
                  <div>
                    <strong>{report.location}</strong>
                    <span>
                      {report.id} · {report.damage}
                    </span>
                  </div>

                  <span
                    className={`severity ${report.severity.toLowerCase()}`}
                  >
                    {report.severity}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Map;