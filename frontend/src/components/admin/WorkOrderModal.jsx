import { SERVER_BASE_URL } from "../../services/api";

function WorkOrderModal({ report, onClose }) {
  if (!report) return null;

  const displayId = report._id ? `WO-RW-${report._id.slice(-6).toUpperCase()}` : "WO-RW-0000";
  const damageType = (report.damageType || "pothole").toUpperCase();
  const severity = (report.severity || "low").toUpperCase();
  const priority = report.priorityScore || 50;
  const address = report.location?.address || "Coordinates Captured on Site";
  const lat = report.location?.coordinates?.[1];
  const lng = report.location?.coordinates?.[0];

  const assignedTeam = report.assignedTeam || "Road Maintenance Team Alpha (Default)";
  const slaHours = report.slaHours || 24;

  const getImageUrl = (url) => {
    if (!url) return null;
    return url.startsWith("http") ? url : `${SERVER_BASE_URL}${url}`;
  };

  const defectImg = getImageUrl(report.imageUrl);

  // Material & Budget Estimation Formula
  const getMaterialEstimate = () => {
    if (damageType.includes("MANHOLE")) {
      return {
        material: "1x Heavy-Duty Ductile Iron Manhole Cover & Frame (600mm Grade D400)",
        weight: "48 kg Cast Iron Unit + 25 kg High-Early Strength Mortar",
        cost: "₹ 8,500",
        crewSize: "3 Specialists",
      };
    }
    if (severity === "HIGH") {
      return {
        material: "High-Performance Cold-Mix Polymer Modified Bituminous Asphalt (PMB-40)",
        weight: "85 kg Bitumen + 0.35 m³ Crushed Stone Aggregate",
        cost: "₹ 6,400",
        crewSize: "4 Field Workers + 1 Roller Operator",
      };
    }
    if (severity === "MEDIUM") {
      return {
        material: "Standard Bituminous Concrete Cold Patching Compound",
        weight: "45 kg Bitumen Mix + 0.20 m³ Aggregate",
        cost: "₹ 3,800",
        crewSize: "3 Field Workers",
      };
    }
    return {
      material: "Rapid Setting Surface Bitumen Tack Coat & Sealant",
      weight: "20 kg Emulsion Patch",
      cost: "₹ 1,950",
      crewSize: "2 Field Workers",
    };
  };

  const est = getMaterialEstimate();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="work-order-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px",
        overflowY: "auto",
      }}
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-sheet, .printable-sheet * {
            visibility: visible;
          }
          .printable-sheet {
            position: fixed;
            left: 0;
            top: 0;
            width: 100vw;
            height: 100vh;
            margin: 0;
            padding: 24px 32px;
            box-sizing: border-box;
            background: #ffffff !important;
            color: #0f172a !important;
            page-break-inside: avoid;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        className="work-order-container"
        style={{
          background: "#ffffff",
          color: "#0f172a",
          borderRadius: "12px",
          maxWidth: "750px",
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px rgba(0,0,0,0.7)",
          fontFamily: "'Segoe UI', Roboto, sans-serif",
          position: "relative",
        }}
      >
        {/* Modal Controls (Hidden in Print) */}
        <div
          className="no-print"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 20px",
            background: "#080e10",
            borderTopLeftRadius: "12px",
            borderTopRightRadius: "12px",
            color: "#fff",
          }}
        >
          <span style={{ fontSize: "12px", color: "#22d3ee", fontWeight: "700" }}>
            📄 Official Municipal Work Order Preview
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                background: "#22d3ee",
                color: "#080e10",
                border: 0,
                padding: "6px 14px",
                borderRadius: "6px",
                fontWeight: "800",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              🖨️ Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Printable Work Order Sheet */}
        <div className="printable-sheet" style={{ padding: "32px 36px" }}>
          {/* Header */}
          <div style={{ borderBottom: "2px solid #0f172a", paddingBottom: "16px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", letterSpacing: "1.5px", textTransform: "uppercase" }}>
                MUNICIPAL CORPORATION · PUBLIC WORKS DEPARTMENT
              </div>
              <h2 style={{ fontSize: "22px", margin: "4px 0 2px", color: "#0f172a", fontWeight: "900" }}>
                ROAD DEFECT REPAIR WORK ORDER
              </h2>
              <span style={{ fontSize: "12px", color: "#475569" }}>
                Issued via RoadWise Automated AI & Geospatial Incident System
              </span>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>WORK ORDER NO.</div>
              <strong style={{ fontSize: "15px", color: "#0284c7" }}>{displayId}</strong>
              <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                Date: {new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
              </div>
            </div>
          </div>

          {/* Core Info Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px", background: "#f8fafc" }}>
              <div style={{ fontSize: "10px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>INCIDENT CLASSIFICATION</div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", margin: "4px 0" }}>
                {damageType.replace("_", " ")}
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                <span style={{ fontSize: "11px", fontWeight: "800", padding: "2px 8px", borderRadius: "4px", background: severity === "HIGH" ? "#fee2e2" : "#fef3c7", color: severity === "HIGH" ? "#dc2626" : "#d97706" }}>
                  Severity: {severity}
                </span>
                <span style={{ fontSize: "11px", fontWeight: "800", padding: "2px 8px", borderRadius: "4px", background: "#e0f2fe", color: "#0284c7" }}>
                  Priority: {priority} / 100
                </span>
              </div>
            </div>

            <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px", background: "#f8fafc" }}>
              <div style={{ fontSize: "10px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>DISPATCHED CREW</div>
              <div style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a", margin: "4px 0" }}>
                {assignedTeam}
              </div>
              <div style={{ fontSize: "11px", color: "#475569", marginTop: "4px" }}>
                <strong>SLA Deadline:</strong> {slaHours} Hours {report.targetDeadline ? `(Target: ${new Date(report.targetDeadline).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })})` : `(Standard SLA)`}
              </div>
            </div>
          </div>

          {/* Location & Photo Row */}
          <div style={{ display: "grid", gridTemplateColumns: defectImg ? "1fr 180px" : "1fr", gap: "16px", marginBottom: "20px" }}>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px" }}>
              <div style={{ fontSize: "10px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>SITE LOCATION & GPS</div>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", margin: "4px 0" }}>
                📍 {address}
              </div>
              {lat && lng && (
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                  Coordinates: <code>{lat.toFixed(5)}, {lng.toFixed(5)}</code> (Accuracy: ±{Math.round(report.locationAccuracy || 8)}m)
                </div>
              )}
              {report.description && (
                <div style={{ fontSize: "11px", color: "#334155", marginTop: "8px", fontStyle: "italic", borderTop: "1px dashed #e2e8f0", paddingTop: "6px" }}>
                  " {report.description} "
                </div>
              )}
            </div>

            {defectImg && (
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden", height: "130px" }}>
                <img src={defectImg} alt="Damage Site" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}
          </div>

          {/* Material & Cost Estimation Box */}
          <div style={{ border: "1.5px solid #0284c7", borderRadius: "8px", padding: "14px 18px", background: "#f0f9ff", marginBottom: "24px" }}>
            <div style={{ fontSize: "11px", fontWeight: "800", color: "#0284c7", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>
              📦 MATERIAL REQUISITION & BUDGET ESTIMATE
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "12px", fontSize: "12px" }}>
              <div>
                <span style={{ color: "#64748b", fontSize: "10px", textTransform: "uppercase", display: "block" }}>Required Materials</span>
                <strong>{est.material}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", fontSize: "10px", textTransform: "uppercase", display: "block" }}>Quantity / Weight</span>
                <strong>{est.weight}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", fontSize: "10px", textTransform: "uppercase", display: "block" }}>Est. Budget</span>
                <strong style={{ color: "#0284c7", fontSize: "14px" }}>{est.cost}</strong>
              </div>
            </div>
          </div>

          {/* Quality Sign-off Section */}
          <div style={{ borderTop: "2px solid #0f172a", paddingTop: "18px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginTop: "24px" }}>
            <div>
              <span style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase" }}>Dispatched By</span>
              <div style={{ height: "40px", borderBottom: "1px dotted #94a3b8", marginTop: "4px" }}></div>
              <span style={{ fontSize: "11px", fontWeight: "700" }}>Zonal Road Officer</span>
            </div>

            <div>
              <span style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase" }}>Field Execution Lead</span>
              <div style={{ height: "40px", borderBottom: "1px dotted #94a3b8", marginTop: "4px" }}></div>
              <span style={{ fontSize: "11px", fontWeight: "700" }}>Contractor / Site Supervisor</span>
            </div>

            <div>
              <span style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase" }}>Quality Verification</span>
              <div style={{ height: "40px", borderBottom: "1px dotted #94a3b8", marginTop: "4px" }}></div>
              <span style={{ fontSize: "11px", fontWeight: "700" }}>Municipal Quality Auditor</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkOrderModal;
