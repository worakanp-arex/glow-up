import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function ScrollToTop() {
  const { pathname, hash, key } = useLocation();

  useEffect(() => {
    if (hash) {
      let id;
      try { id = decodeURIComponent(hash.slice(1)); } catch { id = hash.slice(1); }
      const scroll = () => {
        const target = document.getElementById(id);
        if (target) { target.scrollIntoView({ block: "start" }); return true; }
        return false;
      };
      if (scroll()) return;
      let timeout;
      const observer = new MutationObserver(() => { if (scroll()) { observer.disconnect(); clearTimeout(timeout); } });
      observer.observe(document.body, { childList: true, subtree: true });
      timeout = setTimeout(() => { observer.disconnect(); if (id.startsWith("news")) document.getElementById("news")?.scrollIntoView({ block: "start" }); }, 5000);
      return () => { observer.disconnect(); clearTimeout(timeout); };
    }
    window.scrollTo(0, 0);
  }, [pathname, hash, key]);

  return null;
}

export default ScrollToTop;
