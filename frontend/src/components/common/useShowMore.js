import { useEffect, useState } from "react";

export const SHOW_MORE_LIMIT = 5;

// Lists show their first few items and keep the rest behind a "show more"
// button (see ShowMore.jsx). `resetKey` folds the list back up when what it
// holds changes (a new filter, a new tab).
export function useShowMore(items, limit = SHOW_MORE_LIMIT, resetKey) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { setExpanded(false); }, [resetKey]);
  return {
    shown: expanded ? items : items.slice(0, limit),
    hidden: Math.max(0, items.length - limit),
    expanded,
    toggle: () => setExpanded((value) => !value),
  };
}
