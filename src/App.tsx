import { Outlet } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";

function App() {
  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default App;
