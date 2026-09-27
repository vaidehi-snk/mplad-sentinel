import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { WorkspaceProvider } from "./WorkspaceContext";
import Shell from "./Shell";
import Entrance from "./Entrance";
import { LoadingState } from "./UI";
import "./styles.css";

const Overview = lazy(() => import("./Overview"));
const Register = lazy(() => import("./Register"));
const Dossier = lazy(() => import("./Dossier"));
const Agencies = lazy(() => import("./Agencies"));
const Activity = lazy(() => import("./Activity"));
const Sources = lazy(() => import("./Sources"));

function ProtectedWorkspace() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <WorkspaceProvider>
      <Shell />
    </WorkspaceProvider>
  );
}

export default function WorkspaceApp() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingState />}>
          <Routes>
            <Route path="/" element={<Entrance />} />
            <Route path="/login" element={<Entrance />} />
            <Route path="/app" element={<ProtectedWorkspace />}>
              <Route index element={<Overview />} />
              <Route path="works" element={<Register />} />
              <Route path="works/:id" element={<Dossier />} />
              <Route path="agencies" element={<Agencies />} />
              <Route path="activity" element={<Activity />} />
              <Route path="sources" element={<Sources />} />
              <Route
                path="alerts"
                element={<Navigate to="/app/works" replace />}
              />
              <Route
                path="ledger"
                element={<Navigate to="/app/activity" replace />}
              />
              <Route
                path="network"
                element={<Navigate to="/app/agencies" replace />}
              />
              <Route
                path="ingest"
                element={<Navigate to="/app/sources" replace />}
              />
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
