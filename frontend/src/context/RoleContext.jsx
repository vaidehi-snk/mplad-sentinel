import React, { createContext, useContext, useState, useMemo, useEffect } from "react";
import { works as staticWorks } from "../data";
import { api } from "../api/client";

const RoleContext = createContext(null);

const ROLES = [
  { id: "mp", label: "MP view" },
  { id: "district", label: "District Authority" },
  { id: "state", label: "State Nodal" },
  { id: "ministry", label: "Ministry" },
];

// jurisdiction here is the SPECIFIC value the user picked at login (a real
// constituency/district/state name, or null for Ministry) -- not a guess
// derived from whatever the first row in the dataset happens to be. That
// guessing is exactly what caused a random-looking constituency to show up
// regardless of what the user typed at login.
export function RoleProvider({ children, initialRole = "mp", initialJurisdiction = null }) {
  const [role, setRole] = useState(initialRole);
  const [jurisdiction, setJurisdiction] = useState(initialJurisdiction);
  const [allWorks, setAllWorks] = useState(staticWorks);
  const [source, setSource] = useState("static");
  const [realData, setRealData] = useState(false);
  const [isSmallSample, setIsSmallSample] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api.getWorks().then((data) => {
      if (cancelled) return;
      if (data && data.length) {
        setAllWorks(data);
        setSource("api");
      }
    });
    api.getStatus().then((data) => {
      if (cancelled) return;
      if (data) {
        setRealData(Boolean(data.realData));
        setIsSmallSample(Boolean(data.isSmallSample));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const refreshData = () => setRefreshTick((t) => t + 1);

  // Switching roles via the quick top-bar toggle should feel like zooming
  // in/out geographically (constituency -> district -> state), not jumping
  // to a random unrelated jurisdiction. This finds a real work matching the
  // CURRENT jurisdiction and reads off what its district/state actually is,
  // instead of guessing.
  const changeRole = (newRoleId) => {
    if (newRoleId === "ministry") {
      setRole(newRoleId);
      setJurisdiction(null);
      return;
    }
    const keyByRole = { mp: "constituency", district: "district", state: "state" };
    const currentKey = keyByRole[role];
    const anchor = jurisdiction
      ? allWorks.find((w) => (currentKey === "district" ? w.district || w.constituency : w[currentKey]) === jurisdiction)
      : allWorks[0];
    const newKey = keyByRole[newRoleId];
    const newJurisdiction = anchor ? (newKey === "district" ? anchor.district || anchor.constituency : anchor[newKey]) : null;
    setRole(newRoleId);
    setJurisdiction(newJurisdiction || null);
  };

  const scopedWorks = useMemo(() => {
    if (role === "ministry" || !jurisdiction) return allWorks;
    const keyByRole = { mp: "constituency", district: "district", state: "state" };
    const key = keyByRole[role];
    return allWorks.filter((w) => (key === "district" ? w.district || w.constituency : w[key]) === jurisdiction);
  }, [role, allWorks, jurisdiction]);

  const scopeLabel = useMemo(() => {
    if (role === "ministry") return "Ministry overview \u2014 all states";
    if (!jurisdiction) return "No jurisdiction selected";
    const suffix = role === "mp" ? "constituency" : role === "district" ? "district" : "\u2014 all constituencies";
    return `${jurisdiction} ${suffix}`;
  }, [role, jurisdiction]);

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole: changeRole,
        roles: ROLES,
        jurisdiction,
        setJurisdiction,
        scopedWorks,
        allWorks,
        source,
        realData,
        isSmallSample,
        scopeLabel,
        refreshData,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
