import { useEffect, useState } from "react";

export function useMobileLayout() {
  const [mobile, setMobile] = useState(() => window.matchMedia("(max-width: 860px)").matches);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 860px)");
    const update = () => setMobile(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return mobile;
}
