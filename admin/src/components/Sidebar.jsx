import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Map,
  LogOut,
} from "lucide-react";

function Sidebar() {
  const navItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <LayoutDashboard size={20} />,
    },
    {
      name: "Reports",
      path: "/reports",
      icon: <FileText size={20} />,
    },
    {
      name: "Map",
      path: "/map",
      icon: <Map size={20} />,
    },
  ];

  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white p-5">
      {/* Logo */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">RoadWise</h1>
        <p className="text-sm text-gray-400">Admin Panel</p>
      </div>

      {/* Navigation */}
      <nav className="space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800"
              }`
            }
          >
            {item.icon}
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <button className="flex items-center gap-3 px-4 py-3 mt-8 w-full text-gray-300 hover:bg-gray-800 rounded-lg">
        <LogOut size={20} />
        <span>Logout</span>
      </button>
    </aside>
  );
}

export default Sidebar;