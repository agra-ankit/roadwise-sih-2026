const API_BASE_URL = "http://localhost:5000/api";

export const getReports = async () => {
  const response = await fetch(`${API_BASE_URL}/reports`);

  if (!response.ok) {
    throw new Error("Failed to fetch reports");
  }

  return response.json();
};

export const getReportById = async (id) => {
  const response = await fetch(`${API_BASE_URL}/reports/${id}`);

  if (!response.ok) {
    throw new Error("Failed to fetch report");
  }

  return response.json();
};

export const createReport = async (reportData) => {
  const response = await fetch(`${API_BASE_URL}/reports`, {
    method: "POST",
    body: reportData,
  });

  if (!response.ok) {
    throw new Error("Failed to create report");
  }

  return response.json();
};

export const updateReportStatus = async (id, status) => {
  const response = await fetch(`${API_BASE_URL}/reports/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error("Failed to update report status");
  }

  return response.json();
};