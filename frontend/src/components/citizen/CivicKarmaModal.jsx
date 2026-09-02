import { useState, useEffect } from "react";
import { getCitizenKarma, getLeaderboard } from "../../services/api";

export default function CivicKarmaModal({ isOpen, onClose }) {
  const [citizenName, setCitizenName] = useState(() => {
    return localStorage.getItem("roadwise_citizen_name") || "Citizen Contributor";
  });
  const [activeCitizenId] = useState(() => {
    let id = localStorage.getItem("roadwise_citizen_id");
    if (!id) {
      id = `CIT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      localStorage.setItem("roadwise_citizen_id", id);
    }
    return id;
  });
  const [copied, setCopied] = useState(false);
  const [syncInput, setSyncInput] = useState(() => {
    return localStorage.getItem("roadwise_citizen_contact") || "";
  });
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [viewMode, setViewMode] = useState("dashboard"); // 'dashboard' | 'leaderboard' | 'certificate'
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const [karmaData, setKarmaData] = useState(() => {
    try {
      const storedCount = parseInt(
        localStorage.getItem("roadwise_user_report_count") || "2",
        10
      );
      const points = 20 + storedCount * 15;
      let tier = "Bronze Road Guardian";
      let tierColor = "#cd7f32";
      let tierIcon = "🥉";

      if (points >= 150) {
        tier = "Gold Smart City Pioneer";
        tierColor = "#facc15";
        tierIcon = "🥇";
      } else if (points >= 50) {
        tier = "Silver Civic Champion";
        tierColor = "#22d3ee";
        tierIcon = "🥈";
      }

      return {
        totalPoints: points,
        reportsSubmitted: storedCount,
        repairsCompleted: Math.max(1, Math.floor(storedCount / 2)),
        tier,
        tierColor,
        tierIcon,
      };
    } catch {
      return {
        totalPoints: 50,
        reportsSubmitted: 2,
        repairsCompleted: 1,
        tier: "Bronze Road Guardian",
        tierColor: "#cd7f32",
        tierIcon: "🥉",
      };
    }
  });

  const handleSyncKarma = async (targetIdent) => {
    const ident = targetIdent !== undefined ? targetIdent : syncInput;
    setSyncing(true);
    setSyncMsg("");
    try {
      const citizenId = localStorage.getItem("roadwise_citizen_id") || "";
      const res = await getCitizenKarma(ident, citizenId);
      if (res && typeof res.totalPoints === "number") {
        setKarmaData({
          totalPoints: res.totalPoints,
          reportsSubmitted: res.totalReports,
          repairsCompleted: res.completedCount,
          tier: res.tier,
          tierColor: res.tierColor,
          tierIcon: res.tierIcon,
        });
        if (res.citizenName && res.citizenName !== "Citizen Contributor") {
          setCitizenName(res.citizenName);
          localStorage.setItem("roadwise_citizen_name", res.citizenName);
        }
        if (ident) {
          localStorage.setItem("roadwise_citizen_contact", ident);
        }
        setSyncMsg(`✓ Synced ${res.totalReports} live verified reports from MongoDB!`);
      }
    } catch (err) {
      console.error("Failed to sync karma:", err);
      setSyncMsg("Unable to connect to database.");
    } finally {
      setSyncing(false);
    }
  };

  const loadLeaderboardData = async () => {
    setLoadingLeaderboard(true);
    try {
      const res = await getLeaderboard();
      if (res && Array.isArray(res.leaderboard)) {
        setLeaderboard(res.leaderboard);
      }
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (!isOpen) return;

    const savedContact = localStorage.getItem("roadwise_citizen_contact") || "";
    const savedCitizenId = localStorage.getItem("roadwise_citizen_id") || "";

    if (savedContact || savedCitizenId) {
      getCitizenKarma(savedContact, savedCitizenId)
        .then((res) => {
          if (isMounted && res && typeof res.totalPoints === "number") {
            setKarmaData({
              totalPoints: res.totalPoints,
              reportsSubmitted: res.totalReports,
              repairsCompleted: res.completedCount,
              tier: res.tier,
              tierColor: res.tierColor,
              tierIcon: res.tierIcon,
            });
            if (res.citizenName && res.citizenName !== "Citizen Contributor") {
              setCitizenName(res.citizenName);
            }
          }
        })
        .catch(() => {});
    }

    getLeaderboard()
      .then((res) => {
        if (isMounted && res && Array.isArray(res.leaderboard)) {
          setLeaderboard(res.leaderboard);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const handleNameChange = (e) => {
    const val = e.target.value;
    setCitizenName(val);
    localStorage.setItem("roadwise_citizen_name", val);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  const issueDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const certificateId = `CERT-RW-2026-${Math.abs(
    (citizenName.length * 37 + karmaData.totalPoints * 101) % 90000 + 10000
  ).toString(16).toUpperCase()}`;

  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(5, 10, 12, 0.88)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: "16px",
      }}
      onClick={onClose}
    >
      {/* PRINT STYLES FOR HIGH-RES CERTIFICATE EXPORT */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-certificate, #printable-certificate * {
            visibility: visible;
          }
          #printable-certificate {
            position: fixed;
            left: 0;
            top: 0;
            width: 100vw;
            height: 100vh;
            margin: 0;
            padding: 30px;
            box-sizing: border-box;
            background: #ffffff !important;
            color: #111827 !important;
            border: 12px double #1e3a8a !important;
            page-break-inside: avoid;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        style={{
          background: "#0a1317",
          border: "1px solid rgba(34, 211, 238, 0.25)",
          borderRadius: "18px",
          width: "100%",
          maxWidth: viewMode === "certificate" ? "880px" : viewMode === "leaderboard" ? "680px" : "560px",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(34, 211, 238, 0.15)",
          padding: "26px",
          position: "relative",
          textAlign: "left",
          transition: "all 0.25s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="no-print"
          style={{
            position: "absolute",
            top: "18px",
            right: "18px",
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            color: "#8b9c9f",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            fontSize: "15px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ✕
        </button>

        {/* 3-TAB NAVIGATION BAR */}
        <div
          className="no-print"
          style={{
            display: "flex",
            gap: "8px",
            background: "rgba(255, 255, 255, 0.03)",
            padding: "4px",
            borderRadius: "10px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            marginBottom: "20px",
            width: "calc(100% - 40px)",
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode("dashboard")}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: "8px",
              border: "none",
              background: viewMode === "dashboard" ? "rgba(34, 211, 238, 0.18)" : "transparent",
              color: viewMode === "dashboard" ? "#22d3ee" : "#8b9c9f",
              fontWeight: "700",
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.2s ease",
            }}
          >
            <span>👛</span> My Wallet
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode("leaderboard");
              loadLeaderboardData();
            }}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: "8px",
              border: "none",
              background: viewMode === "leaderboard" ? "rgba(34, 211, 238, 0.18)" : "transparent",
              color: viewMode === "leaderboard" ? "#22d3ee" : "#8b9c9f",
              fontWeight: "700",
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.2s ease",
            }}
          >
            <span>🏆</span> City Leaderboard
          </button>

          <button
            type="button"
            onClick={() => setViewMode("certificate")}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: "8px",
              border: "none",
              background: viewMode === "certificate" ? "rgba(34, 211, 238, 0.18)" : "transparent",
              color: viewMode === "certificate" ? "#22d3ee" : "#8b9c9f",
              fontWeight: "700",
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.2s ease",
            }}
          >
            <span>📜</span> Certificate
          </button>
        </div>

        {/* VIEW 1: KARMA DASHBOARD */}
        {viewMode === "dashboard" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <span style={{ fontSize: "24px" }}>👛</span>
              <div>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: "800",
                    letterSpacing: "1.5px",
                    color: "#22d3ee",
                    textTransform: "uppercase",
                  }}
                >
                  CITIZEN REWARD WALLET
                </span>
                <h3 style={{ margin: 0, fontSize: "20px", color: "#f0f6f8" }}>
                  Civic Karma & Recognition
                </h3>
              </div>
            </div>

            <p style={{ color: "#8b9c9f", fontSize: "12px", lineHeight: "1.4", margin: "8px 0 12px 0" }}>
              Every verified road defect report earns you municipal recognition and civic points.
            </p>

            {/* This Device Citizen ID Box */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "rgba(34, 211, 238, 0.06)",
                border: "1px solid rgba(34, 211, 238, 0.22)",
                padding: "8px 12px",
                borderRadius: "10px",
                marginBottom: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "13px" }}>🆔</span>
                <span style={{ fontSize: "11px", color: "#8b9c9f" }}>This Device Citizen ID:</span>
                <strong
                  style={{
                    fontSize: "12px",
                    color: "#22d3ee",
                    fontFamily: "monospace",
                    letterSpacing: "1px",
                    background: "rgba(0,0,0,0.3)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                  }}
                >
                  {activeCitizenId}
                </strong>
              </div>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(activeCitizenId);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                style={{
                  background: copied ? "#10b981" : "rgba(34, 211, 238, 0.15)",
                  border: "1px solid rgba(34, 211, 238, 0.3)",
                  color: copied ? "#080e10" : "#22d3ee",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: "800",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {copied ? "✓ Copied!" : "📋 Copy ID"}
              </button>
            </div>

            {/* Cross-Device Sync Input Bar */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(34, 211, 238, 0.2)",
                borderRadius: "12px",
                padding: "12px 14px",
                marginBottom: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "#22d3ee", fontWeight: "700", textTransform: "uppercase" }}>
                  📱 Cross-Device Sync
                </span>
                {syncMsg && (
                  <span style={{ fontSize: "11px", color: syncMsg.startsWith("✓") ? "#10b981" : "#ff4d4d", fontWeight: "600" }}>
                    {syncMsg}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  placeholder="Enter Phone, Email, or Citizen ID (e.g. CIT-8F92A)..."
                  value={syncInput}
                  onChange={(e) => setSyncInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSyncKarma();
                  }}
                  style={{
                    flex: 1,
                    padding: "9px 12px",
                    borderRadius: "8px",
                    background: "rgba(10, 18, 22, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#f0f6f8",
                    fontSize: "12px",
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleSyncKarma()}
                  disabled={syncing}
                  style={{
                    padding: "9px 14px",
                    borderRadius: "8px",
                    background: "#22d3ee",
                    color: "#080e10",
                    fontWeight: "800",
                    fontSize: "12px",
                    border: "none",
                    cursor: syncing ? "default" : "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {syncing ? "Syncing..." : "🔄 Sync Points"}
                </button>
              </div>
            </div>

            {/* Big Karma Card */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(34, 211, 238, 0.12), rgba(8, 14, 16, 0.8))",
                border: "1px solid rgba(34, 211, 238, 0.3)",
                borderRadius: "14px",
                padding: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "14px",
                marginBottom: "16px",
              }}
            >
              <div>
                <div style={{ fontSize: "10px", color: "#8b9c9f", textTransform: "uppercase", letterSpacing: "1px" }}>
                  TOTAL CIVIC KARMA
                </div>
                <div style={{ fontSize: "34px", fontWeight: "900", color: "#22d3ee", lineHeight: "1.1" }}>
                  {karmaData.totalPoints}{" "}
                  <span style={{ fontSize: "14px", color: "#8b9c9f", fontWeight: "600" }}>PTS</span>
                </div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    marginTop: "6px",
                    padding: "3px 10px",
                    borderRadius: "20px",
                    background: "rgba(255, 255, 255, 0.08)",
                    border: `1px solid ${karmaData.tierColor}`,
                    color: karmaData.tierColor,
                    fontSize: "11px",
                    fontWeight: "800",
                  }}
                >
                  <span>{karmaData.tierIcon}</span> {karmaData.tier}
                </div>
              </div>

              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "10px", color: "#8b9c9f" }}>REPORTS SUBMITTED</div>
                  <div style={{ fontSize: "20px", fontWeight: "800", color: "#f0f6f8" }}>
                    {karmaData.reportsSubmitted}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "10px", color: "#8b9c9f" }}>REPAIRS COMPLETED</div>
                  <div style={{ fontSize: "20px", fontWeight: "800", color: "#10b981" }}>
                    {karmaData.repairsCompleted}
                  </div>
                </div>
              </div>
            </div>

            {/* Point Earning Matrix */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "10px", color: "#647478", fontWeight: "800", letterSpacing: "1px", marginBottom: "8px", textTransform: "uppercase" }}>
                HOW TO EARN CIVIC KARMA
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "10px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  <div style={{ fontSize: "15px" }}>🕳️</div>
                  <div style={{ fontSize: "13px", fontWeight: "800", color: "#22d3ee", marginTop: "2px" }}>+15 PTS</div>
                  <div style={{ fontSize: "10px", color: "#8b9c9f" }}>Verified Pothole</div>
                </div>
                <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "10px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  <div style={{ fontSize: "15px" }}>⚠️</div>
                  <div style={{ fontSize: "13px", fontWeight: "800", color: "#ff4d4d", marginTop: "2px" }}>+25 PTS</div>
                  <div style={{ fontSize: "10px", color: "#8b9c9f" }}>Open Manhole</div>
                </div>
                <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "10px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  <div style={{ fontSize: "15px" }}>✅</div>
                  <div style={{ fontSize: "13px", fontWeight: "800", color: "#10b981", marginTop: "2px" }}>+10 PTS</div>
                  <div style={{ fontSize: "10px", color: "#8b9c9f" }}>Repair Closed</div>
                </div>
              </div>
            </div>

            {/* View Certificate CTA Button */}
            <button
              onClick={() => setViewMode("certificate")}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #22d3ee, #0284c7)",
                color: "#080e10",
                fontSize: "13px",
                fontWeight: "800",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                boxShadow: "0 6px 20px rgba(34, 211, 238, 0.25)",
              }}
            >
              <span>📜 View & Print Official Municipal Certificate →</span>
            </button>
          </div>
        )}

        {/* VIEW 2: CITY LEADERBOARD */}
        {viewMode === "leaderboard" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <div>
                <span style={{ fontSize: "10px", fontWeight: "800", letterSpacing: "1.5px", color: "#22d3ee", textTransform: "uppercase" }}>
                  MUNICIPALITY RANKINGS
                </span>
                <h3 style={{ margin: "2px 0 0", fontSize: "20px", color: "#f0f6f8" }}>
                  🏆 City Civic Guardians
                </h3>
              </div>

              <button
                type="button"
                onClick={loadLeaderboardData}
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#22d3ee",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                {loadingLeaderboard ? "Refreshing..." : "🔄 Refresh"}
              </button>
            </div>

            {leaderboard.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "36px 16px",
                  background: "rgba(255, 255, 255, 0.02)",
                  borderRadius: "12px",
                  border: "1px dashed rgba(34, 211, 238, 0.25)",
                  marginTop: "10px",
                }}
              >
                <div style={{ fontSize: "36px", marginBottom: "8px" }}>🌱</div>
                <div style={{ fontSize: "15px", fontWeight: "800", color: "#f0f6f8" }}>
                  No Civic Reports in Database Yet
                </div>
                <p style={{ fontSize: "12px", color: "#8b9c9f", maxWidth: "360px", margin: "6px auto 0", lineHeight: "1.5" }}>
                  Be the first citizen to report a verified road hazard and claim the <strong>#1 Gold Pioneer</strong> crown!
                </p>
              </div>
            ) : (
              <>
                {/* Top 3 Podium */}
                {top1 && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: top2 && top3 ? "1fr 1.15fr 1fr" : top2 ? "1fr 1.15fr" : "1fr",
                      gap: "10px",
                      alignItems: "end",
                      marginBottom: "20px",
                    }}
                  >
                    {/* 2nd Place */}
                    {top2 && (
                      <div
                        style={{
                          background: "linear-gradient(180deg, rgba(200, 215, 225, 0.12), rgba(10, 18, 22, 0.8))",
                          border: "1px solid rgba(200, 215, 225, 0.3)",
                          borderRadius: "12px",
                          padding: "12px 10px",
                          textAlign: "center",
                        }}
                      >
                        <div style={{ fontSize: "22px" }}>🥈</div>
                        <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "800", marginTop: "2px" }}>#2 SILVER</div>
                        <div style={{ fontSize: "13px", fontWeight: "700", color: "#f0f6f8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {top2.name}
                        </div>
                        <div style={{ fontSize: "14px", fontWeight: "900", color: "#22d3ee", marginTop: "4px" }}>
                          {top2.points} <span style={{ fontSize: "10px" }}>PTS</span>
                        </div>
                      </div>
                    )}

                    {/* 1st Place (Gold Center) */}
                    <div
                      style={{
                        background: "linear-gradient(180deg, rgba(250, 204, 21, 0.16), rgba(10, 18, 22, 0.9))",
                        border: "1.5px solid rgba(250, 204, 21, 0.4)",
                        borderRadius: "14px",
                        padding: "16px 10px",
                        textAlign: "center",
                        boxShadow: "0 0 25px rgba(250, 204, 21, 0.15)",
                      }}
                    >
                      <div style={{ fontSize: "28px" }}>👑</div>
                      <div style={{ fontSize: "11px", color: "#facc15", fontWeight: "900" }}>#1 GOLD PIONEER</div>
                      <div style={{ fontSize: "14px", fontWeight: "800", color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {top1.name}
                      </div>
                      <div style={{ fontSize: "18px", fontWeight: "900", color: "#facc15", marginTop: "4px" }}>
                        {top1.points} <span style={{ fontSize: "11px", color: "#8b9c9f" }}>PTS</span>
                      </div>
                    </div>

                    {/* 3rd Place */}
                    {top3 && (
                      <div
                        style={{
                          background: "linear-gradient(180deg, rgba(205, 127, 50, 0.12), rgba(10, 18, 22, 0.8))",
                          border: "1px solid rgba(205, 127, 50, 0.3)",
                          borderRadius: "12px",
                          padding: "12px 10px",
                          textAlign: "center",
                        }}
                      >
                        <div style={{ fontSize: "22px" }}>🥉</div>
                        <div style={{ fontSize: "10px", color: "#cd7f32", fontWeight: "800", marginTop: "2px" }}>#3 BRONZE</div>
                        <div style={{ fontSize: "13px", fontWeight: "700", color: "#f0f6f8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {top3.name}
                        </div>
                        <div style={{ fontSize: "14px", fontWeight: "900", color: "#22d3ee", marginTop: "4px" }}>
                          {top3.points} <span style={{ fontSize: "10px" }}>PTS</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Current Citizen Standings Badge */}
                <div
                  style={{
                    background: "rgba(34, 211, 238, 0.08)",
                    border: "1px solid rgba(34, 211, 238, 0.3)",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "14px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "14px" }}>🎯</span>
                    <span style={{ fontSize: "12px", color: "#f0f6f8", fontWeight: "700" }}>
                      Active Profile: <span style={{ color: "#22d3ee" }}>{citizenName}</span>
                    </span>
                  </div>
                  <strong style={{ fontSize: "13px", color: "#22d3ee" }}>{karmaData.totalPoints} PTS</strong>
                </div>

                {/* Leaderboard Table List */}
                <div
                  style={{
                    background: "rgba(10, 18, 22, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    borderRadius: "12px",
                    overflow: "hidden",
                    maxHeight: "240px",
                    overflowY: "auto",
                  }}
                >
                  {leaderboard.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                        background: item.name === citizenName ? "rgba(34, 211, 238, 0.08)" : "transparent",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            background: idx === 0 ? "#facc15" : idx === 1 ? "#94a3b8" : idx === 2 ? "#cd7f32" : "rgba(255,255,255,0.08)",
                            color: idx < 3 ? "#080e10" : "#8b9c9f",
                            fontWeight: "900",
                            fontSize: "11px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {item.rank || idx + 1}
                        </span>
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: "700", color: "#f0f6f8" }}>
                            {item.name} {item.name === citizenName && <span style={{ color: "#22d3ee", fontSize: "10px" }}>(You)</span>}
                          </div>
                          <div style={{ fontSize: "10px", color: "#8b9c9f" }}>
                            {item.totalReports || 1} verified reports
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "13px", fontWeight: "800", color: "#22d3ee" }}>
                          {item.points} PTS
                        </div>
                        <div style={{ fontSize: "9px", color: item.tierColor || "#8b9c9f" }}>
                          {item.tier || "Guardian"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* VIEW 3: OFFICIAL MUNICIPAL CERTIFICATE */}
        {viewMode === "certificate" && (
          <div>
            {/* Top Toolbar */}
            <div
              className="no-print"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
                marginBottom: "18px",
                paddingBottom: "12px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "11px", color: "#8b9c9f" }}>Certificate Name:</span>
                <input
                  type="text"
                  value={citizenName}
                  onChange={handleNameChange}
                  placeholder="Enter full name"
                  style={{
                    padding: "5px 10px",
                    borderRadius: "6px",
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(34, 211, 238, 0.3)",
                    color: "#f0f6f8",
                    fontSize: "12px",
                    fontWeight: "600",
                    outline: "none",
                  }}
                />
              </div>

              <button
                onClick={handlePrint}
                style={{
                  background: "#22d3ee",
                  color: "#080e10",
                  padding: "7px 16px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "800",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                🖨️ Download / Print PDF
              </button>
            </div>

            {/* THE PRINTABLE CERTIFICATE CARD */}
            <div
              id="printable-certificate"
              style={{
                background: "#fdfbf7",
                color: "#0f172a",
                borderRadius: "14px",
                padding: "36px 42px",
                border: "8px double #1e293b",
                boxShadow: "inset 0 0 40px rgba(0, 0, 0, 0.04)",
                textAlign: "center",
                position: "relative",
              }}
            >
              {/* Seal Watermark Background */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  fontSize: "180px",
                  opacity: 0.04,
                  pointerEvents: "none",
                  fontWeight: "900",
                }}
              >
                🏛️
              </div>

              {/* Certificate Header */}
              <div style={{ borderBottom: "2px solid #1e293b", paddingBottom: "14px", marginBottom: "18px" }}>
                <div style={{ fontSize: "11px", letterSpacing: "3px", color: "#475569", fontWeight: "800", textTransform: "uppercase" }}>
                  MUNICIPAL CORPORATION · PUBLIC WORKS DEPARTMENT
                </div>
                <div style={{ fontSize: "10px", letterSpacing: "1.5px", color: "#0284c7", fontWeight: "700", marginTop: "3px", textTransform: "uppercase" }}>
                  SMART CITY URBAN INFRASTRUCTURE & ROAD SAFETY MISSION
                </div>
              </div>

              {/* Main Title */}
              <div style={{ margin: "12px 0" }}>
                <h1
                  style={{
                    fontFamily: "Georgia, serif",
                    fontSize: "28px",
                    fontWeight: "900",
                    color: "#0f172a",
                    letterSpacing: "1px",
                    margin: "0 0 4px 0",
                    textTransform: "uppercase",
                  }}
                >
                  Certificate of Civic Contribution
                </h1>
                <div style={{ fontSize: "11px", color: "#647478", fontStyle: "italic" }}>
                  Official Digital Recognition for Proactive Public Infrastructure Vigilance
                </div>
              </div>

              {/* Awarded To Section */}
              <div style={{ margin: "20px 0" }}>
                <div style={{ fontSize: "11px", color: "#475569", textTransform: "uppercase", letterSpacing: "1px" }}>
                  THIS CERTIFICATE IS PROUDLY PRESENTED TO
                </div>
                <div
                  style={{
                    fontFamily: "Georgia, serif",
                    fontSize: "30px",
                    fontWeight: "800",
                    color: "#0369a1",
                    borderBottom: "1.5px solid #cbd5e1",
                    display: "inline-block",
                    padding: "4px 28px",
                    margin: "6px 0 12px 0",
                  }}
                >
                  {citizenName || "Citizen Contributor"}
                </div>
                <p
                  style={{
                    maxWidth: "600px",
                    margin: "0 auto",
                    fontSize: "12px",
                    lineHeight: "1.6",
                    color: "#334155",
                  }}
                >
                  In high recognition of exemplary civic responsibility, vigilance, and proactive reporting of verified road infrastructure hazards through the <strong>RoadWise AI Smart City Network</strong>, directly contributing to citizen safety and faster municipal repair response.
                </p>
              </div>

              {/* Impact Metrics Row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "24px",
                  margin: "18px 0 24px 0",
                  padding: "8px 0",
                  borderTop: "1px dashed #cbd5e1",
                  borderBottom: "1px dashed #cbd5e1",
                }}
              >
                <div>
                  <span style={{ fontSize: "10px", color: "#647478", display: "block" }}>VERIFIED REPORTS</span>
                  <strong style={{ fontSize: "15px", color: "#0f172a" }}>{karmaData.reportsSubmitted} Hazards</strong>
                </div>
                <div>
                  <span style={{ fontSize: "10px", color: "#647478", display: "block" }}>CIVIC KARMA EARNED</span>
                  <strong style={{ fontSize: "15px", color: "#0284c7" }}>{karmaData.totalPoints} Points</strong>
                </div>
                <div>
                  <span style={{ fontSize: "10px", color: "#647478", display: "block" }}>CIVIC RANK</span>
                  <strong style={{ fontSize: "15px", color: "#d97706" }}>{karmaData.tier}</strong>
                </div>
              </div>

              {/* Signatures & Seal */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  marginTop: "26px",
                  padding: "0 10px",
                }}
              >
                <div style={{ textAlign: "center", minWidth: "150px" }}>
                  <div style={{ fontFamily: "cursive", fontSize: "17px", color: "#1e293b", marginBottom: "2px" }}>
                    Dr. S. K. Verma
                  </div>
                  <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "4px", fontSize: "10px", fontWeight: "700", color: "#475569" }}>
                    MUNICIPAL COMMISSIONER
                    <br />
                    <span style={{ fontWeight: "400", color: "#647478" }}>Smart City Mission Directorate</span>
                  </div>
                </div>

                {/* Central Verified Emblem */}
                <div
                  style={{
                    width: "68px",
                    height: "68px",
                    borderRadius: "50%",
                    border: "3px double #d97706",
                    background: "#fef3c7",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#92400e",
                    boxShadow: "0 0 10px rgba(217, 119, 6, 0.2)",
                  }}
                >
                  <span style={{ fontSize: "18px" }}>🛡️</span>
                  <span style={{ fontSize: "7px", fontWeight: "900", letterSpacing: "0.5px" }}>VERIFIED</span>
                </div>

                <div style={{ textAlign: "center", minWidth: "150px" }}>
                  <div style={{ fontFamily: "cursive", fontSize: "17px", color: "#1e293b", marginBottom: "2px" }}>
                    Er. R. K. Sharma
                  </div>
                  <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "4px", fontSize: "10px", fontWeight: "700", color: "#475569" }}>
                    CHIEF MUNICIPAL ENGINEER
                    <br />
                    <span style={{ fontWeight: "400", color: "#647478" }}>Public Works Department</span>
                  </div>
                </div>
              </div>

              {/* Certificate Footer Stamp */}
              <div
                style={{
                  marginTop: "20px",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "9px",
                  color: "#94a3b8",
                  letterSpacing: "0.5px",
                }}
              >
                <span>ID: <strong>{certificateId}</strong></span>
                <span>DATE: <strong>{issueDate}</strong></span>
                <span>DIGITALLY SIGNED & VERIFIED VIA ROADWISE</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
