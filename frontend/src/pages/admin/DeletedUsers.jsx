import PageHeader from "../../components/common/PageHeader.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import Avatar from "../../components/common/Avatar.jsx";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Archive, Eye, Search } from "lucide-react";
import * as userService from "../../services/userService.js";
import { ROLE_LABELS } from "../../constants/roleLabels.js";
import { ACCOUNT_RETENTION_DAYS } from "../../constants/accountRetention.js";
import "./Users.css";
import "./DeletedUsers.css";

const PAGE_SIZE = 10;
const DATE = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" });

// Accounts that were deleted (by an admin or by the person) and are still kept for
// review or restoring, or have since been anonymised.
function DeletedUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const [applied, setApplied] = useState({});
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    userService
      .listDeletedUsersPage({ ...applied, page, limit: PAGE_SIZE }, controller.signal)
      .then(({ items, total: count }) => {
        if (controller.signal.aborted) return;
        setUsers(items);
        setTotal(count);
      })
      .catch((error) => { if (!controller.signal.aborted) setLoadError(error); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [applied, page]);

  function applyFilters(event) {
    event.preventDefault();
    setPage(1);
    setApplied({ ...(search.trim() && { q: search.trim() }), ...(state && { state }) });
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="users-page deleted-users-page">
      <PageHeader
        icon={Archive}
        backTo="/admin/users"
        backLabel="จัดการผู้ใช้งาน"
        description={<>บัญชีที่ถูกลบจะถูกซ่อนจากระบบทันที ข้อมูลเก็บไว้ {ACCOUNT_RETENTION_DAYS} วันเพื่อให้ตรวจสอบหรือกู้คืนได้ จากนั้นระบบจะลบชื่อ อีเมล และข้อความส่วนตัวถาวร</>}
      >
        บัญชีที่ถูกลบ
      </PageHeader>

      <form className="users-filters" onSubmit={applyFilters} role="search">
        <label className="ui-search users-search">
          <Search size={15} aria-hidden="true" />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาชื่อหรืออีเมล" aria-label="ค้นหาชื่อหรืออีเมล" maxLength={100} />
        </label>
        <select value={state} onChange={(event) => setState(event.target.value)} aria-label="สถานะ">
          <option value="">ทุกสถานะ</option>
          <option value="retained">ยังกู้คืนได้</option>
          <option value="anonymized">ทำให้ไม่ระบุตัวตนแล้ว</option>
        </select>
        <button type="submit" className="ui-btn ui-btn-outline">ค้นหา</button>
      </form>

      {loadError ? (
        <AsyncState error description={loadError.response?.data?.message} onRetry={() => setApplied((current) => ({ ...current }))} />
      ) : (
        <div className="users-table">
          <div className="users-table-head deleted-users-head">
            <span>บัญชี</span>
            <span>ลบเมื่อ</span>
            <span>สถานะ</span>
            <span>ดู</span>
          </div>
          {loading ? <AsyncState /> : users.length === 0 && <p className="users-empty">ไม่มีบัญชีที่ถูกลบ</p>}
          <ul className="users-list">
            {!loading && users.map((user) => (
              <li key={user._id} className="deleted-users-row">
                <Link to={`/admin/deleted-users/${user._id}`} className="users-info" aria-label={`ดูข้อมูลบัญชีที่ถูกลบของ ${user.name}`}>
                  <Avatar user={user.anonymizedAt ? null : user} size={44} />
                  <span className="users-info-text">
                    <span className="users-name">{user.name}</span>
                    <span className="users-meta">{user.anonymizedAt ? ROLE_LABELS[user.role] : `${user.email} · ${ROLE_LABELS[user.role]}`}</span>
                  </span>
                </Link>
                <span className="deleted-users-when">
                  {DATE.format(new Date(user.deletedAt))}
                  <small>{user.deletedBySelf ? "ลบโดยเจ้าของบัญชี" : user.deletedByName ? `ลบโดย ${user.deletedByName}` : ""}</small>
                </span>
                <span className={`deleted-users-state${user.anonymizedAt ? " is-anonymized" : ""}`}>
                  {user.anonymizedAt ? "ทำให้ไม่ระบุตัวตนแล้ว" : `กู้คืนได้อีก ${user.daysLeft} วัน`}
                </span>
                <div className="users-actions">
                  <Link to={`/admin/deleted-users/${user._id}`} title="ดูข้อมูล" aria-label={`ดูข้อมูล ${user.name}`}>
                    <Eye size={16} />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Pagination page={page} pageCount={pageCount} setPage={setPage} total={total} />
    </div>
  );
}

export default DeletedUsers;
