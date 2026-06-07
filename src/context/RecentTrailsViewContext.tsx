/**
 * RecentTrailsViewContext — shares the Recent tab's view mode (list vs.
 * full-bleed cards) between the bottom tab bar (which toggles it on a
 * long-press) and RecentTabScreen (which renders accordingly).
 *
 * Bootstraps from persisted storage on mount and writes back on change.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  DEFAULT_RECENT_TRAILS_VIEW_MODE,
  getRecentTrailsViewMode,
  saveRecentTrailsViewMode,
  type RecentTrailsViewMode,
} from '../utils/recentTrailsStorage';

interface RecentTrailsViewContextValue {
  viewMode: RecentTrailsViewMode;
  setViewMode: (mode: RecentTrailsViewMode) => void;
  /** True until the persisted value has been read back on first mount. */
  hydrated: boolean;
}

const RecentTrailsViewContext = createContext<
  RecentTrailsViewContextValue | undefined
>(undefined);

export function RecentTrailsViewProvider({ children }: PropsWithChildren) {
  const [viewMode, setViewModeState] = useState<RecentTrailsViewMode>(
    DEFAULT_RECENT_TRAILS_VIEW_MODE,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getRecentTrailsViewMode().then((mode) => {
      if (cancelled) return;
      setViewModeState(mode);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setViewMode = useCallback((mode: RecentTrailsViewMode) => {
    setViewModeState(mode);
    void saveRecentTrailsViewMode(mode);
  }, []);

  const value = useMemo(
    () => ({ viewMode, setViewMode, hydrated }),
    [viewMode, setViewMode, hydrated],
  );

  return (
    <RecentTrailsViewContext.Provider value={value}>
      {children}
    </RecentTrailsViewContext.Provider>
  );
}

export function useRecentTrailsView(): RecentTrailsViewContextValue {
  const ctx = useContext(RecentTrailsViewContext);
  if (!ctx) {
    throw new Error(
      'useRecentTrailsView must be used within a RecentTrailsViewProvider',
    );
  }
  return ctx;
}
