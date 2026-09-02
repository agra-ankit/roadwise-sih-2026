import { useState, useEffect } from "react";

function SLATimer({ createdAt, targetDeadline, slaHours = 24, status = "reported" }) {
  const [timeRemaining, setTimeRemaining] = useState({
    hours: 0,
    minutes: 0,
    isOverdue: false,
  });

  useEffect(() => {
    const calculateSLA = () => {
      if (!createdAt) return;

      const createdTime = new Date(createdAt).getTime();
      const slaMs = (Number(slaHours) || 24) * 60 * 60 * 1000;
      const deadlineMs = targetDeadline ? new Date(targetDeadline).getTime() : createdTime + slaMs;
      const nowMs = Date.now();

      const diffMs = deadlineMs - nowMs;

      if (diffMs <= 0) {
        const overdueMs = Math.abs(diffMs);
        const overdueHours = Math.floor(overdueMs / (1000 * 60 * 60));
        const overdueMinutes = Math.floor((overdueMs % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemaining({
          hours: overdueHours,
          minutes: overdueMinutes,
          isOverdue: true,
        });
      } else {
        const remainingHours = Math.floor(diffMs / (1000 * 60 * 60));
        const remainingMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemaining({
          hours: remainingHours,
          minutes: remainingMinutes,
          isOverdue: false,
        });
      }
    };

    calculateSLA();
    const interval = setInterval(calculateSLA, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [createdAt, targetDeadline, slaHours]);

  const isResolved = status === "completed" || status === "verified";

  if (isResolved) {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 12px",
          background: "rgba(16, 185, 129, 0.12)",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          borderRadius: "8px",
          color: "#10b981",
          fontSize: "11px",
          fontWeight: "700",
        }}
      >
        <span>✓</span> SLA Met · Repair Completed
      </div>
    );
  }

  if (timeRemaining.isOverdue) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "3px",
          padding: "8px 12px",
          background: "rgba(239, 68, 68, 0.12)",
          border: "1px solid rgba(239, 68, 68, 0.4)",
          borderRadius: "8px",
          color: "#ff4d4d",
          boxShadow: "0 0 10px rgba(239, 68, 68, 0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: "800" }}>
          <span>🚨</span> SLA BREACHED (Overdue by {timeRemaining.hours}h {timeRemaining.minutes}m)
        </div>
        <span style={{ fontSize: "10px", color: "#fca5a5" }}>
          ⚠ Escalated to Chief Municipal Road Engineer
        </span>
      </div>
    );
  }

  const isUrgent = timeRemaining.hours < 4;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 12px",
        background: isUrgent ? "rgba(245, 158, 11, 0.12)" : "rgba(34, 211, 238, 0.1)",
        border: `1px solid ${isUrgent ? "rgba(245, 158, 11, 0.4)" : "rgba(34, 211, 238, 0.3)"}`,
        borderRadius: "8px",
        color: isUrgent ? "#fbbf24" : "#22d3ee",
        fontSize: "11px",
        fontWeight: "700",
      }}
    >
      <span>⏱️</span>
      <span>
        {timeRemaining.hours}h {timeRemaining.minutes}m remaining ({slaHours}h SLA)
      </span>
    </div>
  );
}

export default SLATimer;
