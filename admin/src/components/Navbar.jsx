import { Bell, User } from "lucide-react";

function Navbar() {
  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">
          RoadWise Admin
        </h2>
      </div>

      <div className="flex items-center gap-5">
        {/* Notification */}
        <button className="text-gray-600 hover:text-gray-900">
          <Bell size={21} />
        </button>

        {/* Admin Profile */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center">
            <User size={18} />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-800">
              Admin
            </p>
            <p className="text-xs text-gray-500">
              Administrator
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;