export const SERVER_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SERVER_BASE_URL) ||
  "http://localhost:5000";

export const API_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
  `${SERVER_BASE_URL}/api`;

export const getReports = async () => {
  const response = await fetch(`${API_BASE_URL}/reports`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || errorData.message || "Failed to fetch reports"
    );
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

export const createReport = async (formData) => {
  const response = await fetch(`${API_BASE_URL}/reports`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || errorData.error || "Failed to create report"
    );
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

export const getIssues = async () => {
  const response = await fetch(`${API_BASE_URL}/issues`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || errorData.message || "Failed to fetch issues"
    );
  }

  return response.json();
};

export const getIssueById = async (id) => {
  const response = await fetch(`${API_BASE_URL}/issues/${id}`);

  if (!response.ok) {
    throw new Error("Failed to fetch issue");
  }

  return response.json();
};

export const trackReport = async (query) => {
  const response = await fetch(`${API_BASE_URL}/reports/track/${encodeURIComponent(query)}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || errorData.message || `No report found matching "${query}"`
    );
  }

  return response.json();
};

export const assignReport = async (id, assignmentData) => {
  const response = await fetch(`${API_BASE_URL}/reports/${id}/assign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(assignmentData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || errorData.message || "Failed to assign repair team"
    );
  }

  return response.json();
};

export const completeReport = async (id, formData) => {
  const response = await fetch(`${API_BASE_URL}/reports/${id}/complete`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || errorData.message || "Failed to mark repair as completed"
    );
  }

  return response.json();
};

export const reverseGeocode = async (latitude, longitude) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
      {
        headers: {
          "Accept-Language": "en",
        },
      }
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (!data || !data.display_name) return null;

    const addr = data.address || {};
    const parts = [
      addr.road || addr.street || addr.suburb || addr.neighbourhood,
      addr.city || addr.town || addr.county || addr.state_district,
      addr.state,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(", ") : data.display_name;
  } catch {
    return null;
  }
};

export const searchLocations = async (query) => {
  if (!query || query.trim().length < 2) return [];
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        query.trim()
      )}&format=json&addressdetails=1&limit=6`,
      {
        headers: {
          "Accept-Language": "en",
        },
      }
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.map((item) => {
      const addr = item.address || {};
      const shortName = [
        item.name || addr.road || addr.suburb || addr.neighbourhood,
        addr.city || addr.town || addr.county || addr.state_district,
        addr.state,
      ]
        .filter(Boolean)
        .join(", ");

      return {
        displayName: item.display_name,
        shortName: shortName || item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
      };
    });
  } catch {
    return [];
  }
};

export const getCitizenKarma = async (identifier = "", citizenId = "") => {
  const params = new URLSearchParams();
  if (identifier && identifier.trim()) params.append("identifier", identifier.trim());
  if (citizenId && citizenId.trim()) params.append("citizenId", citizenId.trim());

  const response = await fetch(`${API_BASE_URL}/reports/karma?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch citizen karma");
  }
  return response.json();
};

export const getLeaderboard = async () => {
  const response = await fetch(`${API_BASE_URL}/reports/leaderboard`);
  if (!response.ok) {
    throw new Error("Failed to fetch city leaderboard");
  }
  return response.json();
};

export const getAdminToken = () => {
  return localStorage.getItem("roadwise_admin_token") || null;
};

export const setAdminToken = (token) => {
  if (token) {
    localStorage.setItem("roadwise_admin_token", token);
  } else {
    localStorage.removeItem("roadwise_admin_token");
  }
};

export const logoutAdmin = () => {
  localStorage.removeItem("roadwise_admin_token");
  localStorage.removeItem("roadwise_admin_user");
};

export const loginAdmin = async (email, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || "Invalid email or password");
  }

  if (data.token) {
    setAdminToken(data.token);
    if (data.user) {
      localStorage.setItem("roadwise_admin_user", JSON.stringify(data.user));
    }
  }

  return data;
};

export const getAdminProfile = async () => {
  const token = getAdminToken();
  if (!token) throw new Error("No token found");

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    logoutAdmin();
    throw new Error("Session expired. Please sign in again.");
  }

  return response.json();
};