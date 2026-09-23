import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { DeskProvider, useDesk } from "./core";
import { Shell, DeskDialog } from "./shell";
import { Loading } from "./ui";
import Entrance from "./pages/Entrance";
import "./theme.css";
import "./pages.css";
import "./case.css";
import "./extra.css";
import "./v2.css";
import "./today.css";
import "./atlas.css";
import "./round.css";

const Today = lazy(() => import("./pages/Today"));
const Atlas = lazy(() => import("./pages/Atlas"));
const Round = lazy(() => import("./pages/Round"));
const Cases = lazy(() => import("./pages/Cases"));
const CaseFile = lazy(() => import("./pages/CaseFile"));
const Ledger = lazy(() => import("./pages/Ledger"));
const Method = lazy(() => import("./pages/Method"));

function Desk() {
  const { desk } = useDesk();
  if (!desk) return <Navigate to="/" replace />;
  return <Shell />;
}
const lens = (l) => <Navigate to={`/desk/atlas?lens=${l}`} replace />;

export default function App() {
  return (
    <DeskProvider>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Entrance />} />
            <Route path="/desk" element={<Desk />}>
              <Route index element={<Today />} />
              <Route path="atlas" element={<Atlas />} />
              <Route path="round" element={<Round />} />
              <Route path="cases" element={<Cases />} />
              <Route path="cases/*" element={<CaseFile />} />
              <Route path="ledger" element={<Ledger />} />
              <Route path="method" element={<Method />} />
              <Route path="compliance" element={lens("compliance")} />
              <Route path="duplicates" element={lens("duplicates")} />
              <Route path="vendors" element={lens("vendors")} />
              <Route path="trends" element={lens("forecast")} />
              <Route path="*" element={<Navigate to="/desk" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <DeskDialog />
      </BrowserRouter>
    </DeskProvider>
  );
}
