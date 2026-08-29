import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import "./admin.css";

import CitizenHome from "./pages/citizen/Home";
import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminReports from "./pages/admin/Reports";
import ReportDetails from "./pages/admin/ReportDetails";
import IssueDetails from "./pages/admin/IssueDetails";
import AdminMap from "./pages/admin/Map";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CitizenHome />} />

        <Route path="/admin/login" element={<AdminLogin />} />

        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/admin/reports/:id" element={<ReportDetails />} />
        <Route path="/admin/issues/:id" element={<IssueDetails />} />
        <Route path="/admin/map" element={<AdminMap />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
