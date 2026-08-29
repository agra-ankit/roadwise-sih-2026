import { useState } from "react";
import { assignReport } from "../../services/api";

const MUNICIPAL_TEAMS = [
  {
    id: "team_alpha",
    name: "Road Maintenance Team Alpha",
    zone: "Central Municipal Zone",
    type: "Rapid Pothole Response",
    lead: "Er. Rajesh Kumar",
  },
  {
    id: "team_hazard",
    name: "Emergency Infrastructure Unit 3",
    zone: "Citywide Safety Division",
    type: "Open Manholes & Critical Hazards",
    lead: "Er. Sunita Verma",
  },
  {
    id: "team_asphalt",
    name: "Asphalt Patching Crew 7",
    zone: "Highway & Arterial Corridors",
    type: "Major Road Resurfacing",
    lead: "Er. Manoj Tripathi",
  },
  {
    id: "team_suburban",
    name: "Suburban Road Maintenance Division",
    zone: "Outer Ring & Residential Wards",
    type: "Routine Surface Patching",
    lead: "Er. Amit Singh",
  },
];

function AssignTeamModal({ reportId, currentTeam, onClose, onAssigned }) {
  const [selectedTeam, setSelectedTeam] = useState(
    currentTeam || MUNICIPAL_TEAMS[0].name
  );
  const [slaHours, setSlaHours] = useState(24);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedTeam) {
      setError("Please select a municipal repair team.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const deadline = new Date(Date.now() + Number(slaHours) * 60 * 60 * 1000);
      const res = await assignReport(reportId, {
        assignedTeam: selectedTeam,
        slaHours: Number(slaHours),
        targetDeadline: deadline.toISOString(),
        assignmentNotes: notes,
      });

      if (onAssigned) {
        onAssigned(res.report || { assignedTeam: selectedTeam, status: "assigned", slaHours, targetDeadline: deadline });
      }
      onClose();
    } catch (err) {
      setError(err.message || "Failed to assign repair team");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.82)",
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
          borderRadius: "18px",
          padding: "28px",
          maxWidth: "520px",
          width: "100%",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <div style={{ fontSize: "11px", color: "#22d3ee", fontWeight: "800", letterSpacing: "1px", textTransform: "uppercase" }}>
              DISPATCH WORK ORDER
            </div>
            <h3 style={{ margin: "4px 0 0", color: "#f0f6f8", fontSize: "20px" }}>
              Assign Municipal Repair Team
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: 0,
              color: "#8b9c9f",
              fontSize: "20px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(255, 70, 70, 0.1)", border: "1px solid rgba(255, 70, 70, 0.3)", borderRadius: "8px", color: "#ff9b9b", fontSize: "12px", marginBottom: "16px" }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleAssign}>
          <div style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", fontSize: "11px", color: "#8b9c9f", fontWeight: "700", textTransform: "uppercase", marginBottom: "8px" }}>
              Select Municipal Crew / Division
            </label>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {MUNICIPAL_TEAMS.map((team) => {
                const isSelected = selectedTeam === team.name;
                return (
                  <div
                    key={team.id}
                    onClick={() => setSelectedTeam(team.name)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "10px",
                      background: isSelected ? "rgba(34, 211, 238, 0.12)" : "#050b0d",
                      border: isSelected ? "1.5px solid #22d3ee" : "1px solid rgba(255, 255, 255, 0.08)",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: "13px", color: isSelected ? "#22d3ee" : "#f0f6f8", display: "block" }}>
                        {team.name}
                      </strong>
                      <span style={{ fontSize: "11px", color: "#8b9c9f" }}>
                        {team.zone} · Lead: {team.lead}
                      </span>
                    </div>
                    {isSelected && <span style={{ color: "#22d3ee", fontWeight: "900" }}>✓</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", fontSize: "11px", color: "#8b9c9f", fontWeight: "700", textTransform: "uppercase", marginBottom: "8px" }}>
              Resolution SLA Target Deadline
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {[
                { hours: 12, label: "⚡ 12 Hours (Emergency SLA)" },
                { hours: 24, label: "⏱️ 24 Hours (High Priority)" },
                { hours: 48, label: "📅 48 Hours (Standard Medium)" },
                { hours: 72, label: "🗓️ 72 Hours (Routine Patch)" },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.hours}
                  onClick={() => setSlaHours(opt.hours)}
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    background: slaHours === opt.hours ? "rgba(34, 211, 238, 0.2)" : "#050b0d",
                    border: slaHours === opt.hours ? "1px solid #22d3ee" : "1px solid rgba(255, 255, 255, 0.08)",
                    color: slaHours === opt.hours ? "#22d3ee" : "#8b9c9f",
                    fontSize: "11px",
                    fontWeight: "700",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "11px", color: "#8b9c9f", fontWeight: "700", textTransform: "uppercase", marginBottom: "6px" }}>
              Priority Instructions / Notes for Supervisor
            </label>
            <textarea
              rows="3"
              placeholder="e.g. Bring cold mix bitumen patcher, barricade left lane during morning rush hour..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "#050b0d",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                color: "#f0f6f8",
                fontSize: "12px",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 18px",
                background: "transparent",
                color: "#8b9c9f",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "10px 22px",
                background: "#22d3ee",
                color: "#080e10",
                border: 0,
                borderRadius: "8px",
                fontWeight: "800",
                fontSize: "13px",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 0 14px rgba(34, 211, 238, 0.3)",
              }}
            >
              {loading ? "Dispatching..." : "Confirm & Dispatch Crew →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AssignTeamModal;
