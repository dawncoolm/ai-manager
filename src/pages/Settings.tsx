import { useNavigate } from "react-router-dom";
import { HardDrive } from "lucide-react";

const settingsItems = [
  {
    id: "cache",
    name: "Conversation Cache",
    description: "Manage conversation history data for AI tools",
    icon: HardDrive,
    path: "/settings/cache",
    color: "bg-red-50 text-red-600",
  },
];

export default function Settings() {
  const navigate = useNavigate();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      <p className="mt-1 text-sm text-gray-500">Application settings</p>

      <div className="mt-8 grid grid-cols-3 gap-5">
        {settingsItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className="group flex flex-col items-start rounded-xl border border-gray-200 bg-white p-6 text-left transition-shadow hover:shadow-md"
          >
            <div className={`rounded-lg p-2.5 ${item.color}`}>
              <item.icon className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-gray-900">
              {item.name}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{item.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
