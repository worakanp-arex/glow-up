import { useEffect, useState } from "react";

export const SHOW_MORE_LIMIT = 5;

// รายการแสดงเพียงไม่กี่รายการแรกและซ่อนที่เหลือไว้หลังปุ่ม "ดูเพิ่ม"
// (ดู ShowMore.jsx) `resetKey` พับรายการกลับเมื่อสิ่งที่รายการถือ
// เปลี่ยน (ตัวกรองใหม่ แท็บใหม่)
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
