import React from "react";
import ReactDOM from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import Home from "./pages/Home";
import SkillsDashboard from "./pages/skills/SkillsDashboard";
import ToolDetailPage from "./pages/skills/ToolDetailPage";
import SkillDetailPage from "./pages/skills/SkillDetailPage";
import HubPage from "./pages/skills/HubPage";
import Settings from "./pages/Settings";
import "./App.css";

const router = createHashRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: "skills", element: <SkillsDashboard /> },
      { path: "skills/tools/:toolId", element: <ToolDetailPage /> },
      {
        path: "skills/tools/:toolId/:skillName",
        element: <SkillDetailPage />,
      },
      { path: "skills/hub", element: <HubPage /> },
      { path: "skills/hub/:skillName", element: <SkillDetailPage /> },
      { path: "settings", element: <Settings /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
