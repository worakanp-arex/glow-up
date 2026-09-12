import { ChevronLeft, ChevronRight } from "lucide-react";
export default function Pagination({ page, pageCount, setPage, total }) {
  if (pageCount <= 1) return null;
  return <nav className="pagination" aria-label="แบ่งหน้ารายการ"><span>{total.toLocaleString("th-TH")} รายการ</span>
    <div><button type="button" onClick={() => setPage(page - 1)} disabled={page <= 1} aria-label="หน้าก่อนหน้า"><ChevronLeft size={18} /></button>
    <span aria-live="polite">หน้า {page} จาก {pageCount}</span>
    <button type="button" onClick={() => setPage(page + 1)} disabled={page >= pageCount} aria-label="หน้าถัดไป"><ChevronRight size={18} /></button></div></nav>;
}
