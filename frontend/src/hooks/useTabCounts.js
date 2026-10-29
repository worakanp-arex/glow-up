import { useCallback, useEffect, useState } from "react";

// มีกี่รายการอยู่หลังแต่ละแท็บหรือตัวกรอง สำหรับแท็บที่โหลดรายการทีละหน้า
// `load` ตอบ `{ [tabKey]: count }` เรียก `refresh` หลังมีสิ่งที่เปลี่ยนรายการ
// (การอนุมัติ การลบ การเปลี่ยนสถานะ) ขณะที่ยังไม่รู้จำนวน
// (หรือโหลดไม่สำเร็จ) จะตอบ `null` และแท็บแสดงเฉพาะป้ายชื่อ
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

// ขอ endpoint รายการที่แบ่งหน้าให้ส่งหนึ่งรายการต่อแท็บ เพื่ออ่านจำนวนรวมเท่านั้น
export function countByTab(tabs, fetchPage) {
  return Promise.all(tabs.map((item) => fetchPage({ page: 1, limit: 1, ...item.params }).then(({ total }) => [item.key, total]))).then(Object.fromEntries);
}
