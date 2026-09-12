import { useState } from "react";
export function usePagination(items, pageSize = 10) {
  const [requestedPage, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(requestedPage, pageCount);
  return { items: items.slice((page - 1) * pageSize, page * pageSize), page, pageCount, setPage, total: items.length };
}
