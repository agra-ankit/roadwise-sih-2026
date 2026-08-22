import {
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import StatCard from "../components/StatCard";

function Dashboard() {
  // Temporary dummy data
  const reports = [
    {
      id: "RW-001",
      location: "Civil Lines",
      damage: "Pothole",
      severity: "High",
      status: "Pending",
    },
    {
      id: "RW-002",
      location: "Naini",
      damage: "Crack",
      severity: "Medium",
      status: "Assigned",
    },
    {
      id: "RW-003",
      location: "Katra",
      damage: "Pothole",
      severity: "Critical",
      status: "Pending",
    },
    {
      id: "RW-004",
      location: "Tagore Town",
      damage: "Road Crack",
      severity: "Low",
      status: "Completed",
    },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1">
        <Navbar />

        <main className="p-6">
          {/* Page Heading */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">
              Dashboard
            </h1>

            <p className="text-gray-500 mt-1">
              Monitor and manage road damage reports.
            </p>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <StatCard
              title="Total Reports"
              value="124"
              icon={<FileText size={24} />}
              description="All reported damages"
            />

            <StatCard
              title="Pending"
              value="42"
              icon={<Clock size={24} />}
              description="Waiting for action"
            />

            <StatCard
              title="High Priority"
              value="12"
              icon={<AlertTriangle size={24} />}
              description="Needs urgent attention"
            />

            <StatCard
              title="Completed"
              value="70"
              icon={<CheckCircle size={24} />}
              description="Successfully repaired"
            />
          </div>

          {/* Recent Reports */}
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-5 border-b">
              <h2 className="text-lg font-semibold text-gray-800">
                Recent Reports
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Latest road damage reports
              </p>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-sm font-semibold text-gray-600">
                      Report ID
                    </th>

                    <th className="px-5 py-3 text-sm font-semibold text-gray-600">
                      Location
                    </th>

                    <th className="px-5 py-3 text-sm font-semibold text-gray-600">
                      Damage
                    </th>

                    <th className="px-5 py-3 text-sm font-semibold text-gray-600">
                      Severity
                    </th>

                    <th className="px-5 py-3 text-sm font-semibold text-gray-600">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {reports.map((report) => (
                    <tr
                      key={report.id}
                      className="border-t hover:bg-gray-50"
                    >
                      <td className="px-5 py-4 text-sm font-medium text-gray-800">
                        {report.id}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {report.location}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {report.damage}
                      </td>

                      <td className="px-5 py-4">
                        <SeverityBadge severity={report.severity} />
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={report.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/* Severity Badge */
function SeverityBadge({ severity }) {
  const styles = {
    Critical: "bg-red-100 text-red-700",
    High: "bg-orange-100 text-orange-700",
    Medium: "bg-yellow-100 text-yellow-700",
    Low: "bg-green-100 text-green-700",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${
        styles[severity]
      }`}
    >
      {severity}
    </span>
  );
}

/* Status Badge */
function StatusBadge({ status }) {
  const styles = {
    Pending: "bg-yellow-100 text-yellow-700",
    Assigned: "bg-blue-100 text-blue-700",
    Completed: "bg-green-100 text-green-700",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${
        styles[status]
      }`}
    >
      {status}
    </span>
  );
}

export default Dashboard;