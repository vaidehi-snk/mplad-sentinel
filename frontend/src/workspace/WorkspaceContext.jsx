import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "../api/client";
import { latestReviews } from "./model";

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const [works, setWorks] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const reload = useCallback(async () => {
    setLoading(true);
    const [records, decisions, history] = await Promise.all([
      api.getWorks(),
      api.getReviews(),
      api.getLedger(),
    ]);
    if (
      !Array.isArray(records) ||
      !Array.isArray(decisions) ||
      !Array.isArray(history)
    ) {
      setError(
        "We could not load the workspace. Check the local API or sign in again.",
      );
    } else {
      setWorks(records);
      setReviews(decisions);
      setEvents(history);
      setError("");
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  const latest = useMemo(() => latestReviews(reviews), [reviews]);
  const value = {
    works,
    reviews,
    latest,
    events,
    loading,
    error,
    reload,
    notice,
    notify: setNotice,
  };
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);
