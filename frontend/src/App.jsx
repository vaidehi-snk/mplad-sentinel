import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import { RoleProvider } from "./context/RoleContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import MpRoster from "./pages/MpRoster";
import NationalMpPerformance from "./pages/NationalMpPerformance";
import Alerts from "./pages/Alerts";
import Ledger from "./pages/Ledger";
import Network from "./pages/Network";
import Citizen from "./pages/Citizen";
import Ingest from "./pages/Ingest";
import GhostWorkCheck from "./pages/GhostWorkCheck";

function DashboardLayout() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <RoleProvider initialRole={user.roleId || "mp"} initialJurisdiction={user.jurisdiction || null}>
      <div className="app-shell">
        <Sidebar />
        <div className="main-area">
          <TopBar />
          <Outlet />
        </div>
      </div>
    </RoleProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/app" element={<DashboardLayout />}>
            <Route index element={<Overview />} />
            <Route path="mps" element={<MpRoster />} />
            <Route path="national" element={<NationalMpPerformance />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="ledger" element={<Ledger />} />
            <Route path="network" element={<Network />} />
            <Route path="citizen" element={<Citizen />} />
            <Route path="ghost-check" element={<GhostWorkCheck />} />
            <Route path="ingest" element={<Ingest />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
