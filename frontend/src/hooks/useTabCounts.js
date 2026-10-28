import { useCallback, useEffect, useState } from "react";

// How many items sit behind each tab or filter, for tabs whose lists are loaded
// a page at a time. `load` answers `{ [tabKey]: count }`; call `refresh` after
// something changes the lists (an approval, a deletion, a status switch). While
// the counts are unknown (or failed to load) it answers `null` and tabs show
// just their label.
export function useTabCounts(load) {
  const [counts, setCounts] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((result) => { if (!cancelled) setCounts(result); })
      .catch(() => { if (!cancelled) setCounts(null); });
    return () => { cancelled = true; };
    // `load` is rebuilt on every render; only `refresh` should trigger a reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const refresh = useCallback(() => setVersion((value) => value + 1), []);
  return [counts, refresh];
}

// Asks a paginated list endpoint for one item per tab just to read its total.
export function countByTab(tabs, fetchPage) {
  return Promise.all(tabs.map((item) => fetchPage({ page: 1, limit: 1, ...item.params }).then(({ total }) => [item.key, total]))).then(Object.fromEntries);
}
