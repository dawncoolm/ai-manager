import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  BrainCircuit,
  Settings,
} from "lucide-react";

const modules = [
  { id: "home", name: "Home", icon: Home, path: "/" },
  { id: "skills", name: "AI Skills", icon: BrainCircuit, path: "/skills" },
];

const skillsSubNav = [
  { name: "Dashboard", path: "/skills" },
  { name: "By Skill", path: "/skills/by-skill" },
  { name: "Skills Hub", path: "/skills/hub" },
];

export default function Sidebar() {
  const location = useLocation();
  const inSkillsModule = location.pathname.startsWith("/skills");

  return (
    <aside className="flex h-full w-[220px] flex-shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-4">
        <BrainCircuit className="h-6 w-6 text-indigo-600" />
        <span className="text-base font-semibold text-gray-900">
          AI Manager
        </span>
      </div>

      {/* Module navigation */}
      <nav className="flex-1 space-y-1 px-3 py-3">
        {modules.map((mod) => (
          <NavLink
            key={mod.id}
            to={mod.path}
            end={mod.path === "/"}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive || (mod.id === "skills" && inSkillsModule)
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`
            }
          >
            <mod.icon className="h-4.5 w-4.5" />
            {mod.name}
          </NavLink>
        ))}

        {/* Skills sub-navigation */}
        {inSkillsModule && (
          <div className="ml-3 mt-2 space-y-0.5 border-l border-gray-200 pl-3">
            {skillsSubNav.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end
                className={({ isActive }) =>
                  `block rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                    isActive
                      ? "font-medium text-indigo-700"
                      : "text-gray-500 hover:text-gray-900"
                  }`
                }
              >
                {item.name}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* Settings */}
      <div className="border-t border-gray-200 px-3 py-3">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-indigo-50 text-indigo-700"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`
          }
        >
          <Settings className="h-4.5 w-4.5" />
          Settings
        </NavLink>
      </div>
    </aside>
  );
}
