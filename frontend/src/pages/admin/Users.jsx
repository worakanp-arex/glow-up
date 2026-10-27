import PageHeader from "../../components/common/PageHeader.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import Avatar from "../../components/common/Avatar.jsx";
import EditorDialog from "../../components/common/EditorDialog.jsx";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import useConfirmDialog from "../../components/common/useConfirmDialog.jsx";
import useReasonDialog from "../../components/common/useReasonDialog.jsx";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Ban, CalendarHeart, Check, Filter, Pencil, RotateCcw, Trash2, UserPlus, Users as UsersIcon, X } from "lucide-react";
import * as userService from "../../services/userService.js";
import { ROLE_LABELS } from "../../constants/roleLabels.js";
import { ACCOUNT_RETENTION_DAYS } from "../../constants/accountRetention.js";
import "./Users.css";

const INITIAL_ACCOUNT_FORM = { role: "counsellor", name: "", email: "", password: "", phone: "", specialization: "", hospital: "", position: "", department: "" };
const PAGE_SIZE = 10;
const STATUS_OPTIONS = [
  ["pending", "รอดำเนินการ"],
  ["verified", "ยืนยันแล้ว"],
  ["rejected", "ปฏิเสธ"],
  ["suspended", "ระงับการใช้งาน"],
];

function Users() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState(searchParams.get("role") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("verifiedStatus") || "");
  const [appliedFilters, setAppliedFilters] = useState(() => {
    const params = {};
    if (searchParams.get("role")) params.role = searchParams.get("role");
    if (searchParams.get("verifiedStatus")) params.verifiedStatus = searchParams.get("verifiedStatus");
    return params;
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState("");
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", role: "user" });
  const [creating, setCreating] = useState(() => (["admin", "counsellor"].includes(searchParams.get("create")) ? searchParams.get("create") : null));
  const [accountForm, setAccountForm] = useState(() => ({ ...INITIAL_ACCOUNT_FORM, role: searchParams.get("create") === "admin" ? "admin" : "counsellor" }));
  const { confirm, confirmDialog } = useConfirmDialog();
  const { askReason, reasonDialog } = useReasonDialog();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    userService
      .listUsersPage({ ...appliedFilters, page, limit: PAGE_SIZE }, controller.signal)
      .then(({ items, total: count }) => {
        if (controller.signal.aborted) return;
        setUsers(items);
        setTotal(count);
      })
      .catch((error) => { if (!controller.signal.aborted) setLoadError(error); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [appliedFilters, page]);

  function applyFilters() {
    setPage(1);
    const params = {};
    if (roleFilter) params.role = roleFilter;
    if (statusFilter) params.verifiedStatus = statusFilter;
    setAppliedFilters(params);
    setSearchParams(params);
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function setStatus(user, status, reason) {
    setActionError("");
    try {
      const updated = await userService.verifyUser(user._id, status, reason);
      setUsers((prev) => prev.map((u) => (u._id === user._id ? updated : u)));
    } catch (err) {
      setActionError(err.response?.data?.message || "ดำเนินการไม่สำเร็จ");
      throw err;
    }
  }

  function reject(user, status) {
    askReason({
      title: status === "suspended" ? `ระงับการใช้งาน "${user.name}"` : `ปฏิเสธการยืนยันตัวตนของ "${user.name}"`,
      description: "เหตุผลจะถูกส่งให้เจ้าของบัญชีในการแจ้งเตือน",
      confirmLabel: status === "suspended" ? "ระงับบัญชี" : "ปฏิเสธ",
      onConfirm: (reason) => setStatus(user, status, reason),
    });
  }

  function handleDelete(user) {
    confirm({
      title: "ลบผู้ใช้",
      message: `ต้องการลบผู้ใช้ "${user.name}" ใช่ไหม? บัญชีจะถูกซ่อนและเข้าสู่ระบบไม่ได้ทันที ข้อมูลจะถูกเก็บไว้ ${ACCOUNT_RETENTION_DAYS} วัน (กู้คืนได้จากหน้า "บัญชีที่ถูกลบ") แล้วจึงถูกทำให้ไม่ระบุตัวตนถาวร`,
      confirmLabel: "ลบผู้ใช้",
      onConfirm: async () => {
        await userService.deleteUser(user._id);
        setUsers((prev) => prev.filter((u) => u._id !== user._id));
        setTotal((count) => Math.max(0, count - 1));
      },
    });
  }

  function startEdit(user) {
    setEditForm({ name: user.name, phone: user.phone || "", role: user.role });
    setEditing(user);
  }

  async function saveEdit() {
    const updated = await userService.updateUser(editing._id, editForm);
    setUsers((prev) => prev.map((u) => (u._id === editing._id ? updated : u)));
  }

  async function createAccount() {
    const { role, name, email, password, phone, specialization, hospital, position, department } = accountForm;
    const payload = { role, name, email, password, phone, ...(role === "counsellor" ? { specialization, hospital } : { position, department }) };
    const created = await userService.createUser(payload);
    setUsers((prev) => [created, ...prev]);
    setTotal((count) => count + 1);
  }

  const setAccount = (name, value) => setAccountForm((prev) => ({ ...prev, [name]: value }));

  const header = (
    <PageHeader
      icon={UsersIcon}
      eyebrow="Admin"
      description="ตรวจสอบ ยืนยันตัวตน และจัดการบัญชีผู้ใช้งาน นายจ้าง บุคลากรทางการแพทย์ และผู้ดูแลระบบทั้งหมด กดที่ชื่อเพื่อดูโปรไฟล์"
      actions={<button type="button" className="ui-btn ui-btn-primary" onClick={() => { setAccountForm({ ...INITIAL_ACCOUNT_FORM }); setCreating("counsellor"); }}><UserPlus size={15} aria-hidden="true" />เพิ่มบัญชีเจ้าหน้าที่</button>}
    >จัดการผู้ใช้งาน</PageHeader>
  );

  if (loadError) return <div className="users-page">{header}<AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;

  return (
    <div className="users-page">
      {confirmDialog}
      {reasonDialog}
      {header}

      <div className="users-filters">
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="กรองตามบทบาท">
          <option value="">ทุกบทบาท</option>
          {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="กรองตามสถานะ">
          <option value="">ทุกสถานะ</option>
          {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button type="button" className="ui-btn ui-btn-outline" onClick={applyFilters}>
          <Filter size={15} />
          <span>กรอง</span>
        </button>
      </div>

      {actionError && <p className="users-action-error" role="alert">{actionError}</p>}

      <div className="users-table">
        <div className="users-table-head">
          <span>ผู้ใช้งาน</span>
          <span>สถานะ</span>
          <span>จัดการ</span>
        </div>

        {loading ? <AsyncState /> : users.length === 0 && <p className="users-empty">ไม่พบผู้ใช้งานที่ตรงกับเงื่อนไข</p>}

        <ul className="users-list">
          {!loading && users.map((user) => (
            <li key={user._id}>
              <Link to={`/admin/users/${user._id}`} className="users-info" aria-label={`ดูโปรไฟล์ ${user.name}`}>
                <Avatar user={user} size={44} />
                <span className="users-info-text">
                  <span className="users-name">{user.name}</span>
                  <span className="users-meta">{user.email} · {ROLE_LABELS[user.role]}</span>
                  {user.role === "employer" && (user.companyName || user.taxId || user.businessType) && (
                    <span className="users-verification-detail">
                      {[user.companyName, user.businessType, user.taxId && `เลขผู้เสียภาษี: ${user.taxId}`].filter(Boolean).join(" · ")}
                    </span>
                  )}
                  {user.role === "counsellor" && (user.specialization || user.hospital) && (
                    <span className="users-verification-detail">{[user.specialization, user.hospital].filter(Boolean).join(" · ")}</span>
                  )}
                  {user.role === "admin" && (user.position || user.department) && (
                    <span className="users-verification-detail">{[user.position, user.department].filter(Boolean).join(" · ")}</span>
                  )}
                </span>
              </Link>
              <StatusBadge status={user.verifiedStatus} />
              <div className="users-actions">
                {user.verifiedStatus === "pending" && (
                  <>
                    <button type="button" className="users-action-approve" onClick={() => setStatus(user, "verified").catch(() => {})} title="ยืนยัน" aria-label={`ยืนยัน ${user.name}`}>
                      <Check size={16} />
                    </button>
                    <button type="button" className="users-action-reject" onClick={() => reject(user, "rejected")} title="ปฏิเสธ" aria-label={`ปฏิเสธ ${user.name}`}>
                      <X size={16} />
                    </button>
                  </>
                )}
                {user.verifiedStatus === "suspended" ? (
                  <button type="button" className="users-action-approve" onClick={() => setStatus(user, "verified").catch(() => {})} title="ยกเลิกการระงับ" aria-label={`ยกเลิกการระงับ ${user.name}`}>
                    <RotateCcw size={16} />
                  </button>
                ) : (
                  user.role !== "admin" && (
                    <button type="button" className="users-action-reject" onClick={() => reject(user, "suspended")} title="ระงับการใช้งานชั่วคราว" aria-label={`ระงับ ${user.name}`}>
                      <Ban size={16} />
                    </button>
                  )
                )}
                {user.role === "user" && (
                  <Link to={`/admin/users/${user._id}/emotion`} title="ดูปฏิทินอารมณ์" aria-label={`ดูปฏิทินอารมณ์ ${user.name}`}>
                    <CalendarHeart size={16} />
                  </Link>
                )}
                <button type="button" onClick={() => startEdit(user)} title="แก้ไข" aria-label={`แก้ไข ${user.name}`}>
                  <Pencil size={16} />
                </button>
                <button type="button" className="users-delete" onClick={() => handleDelete(user)} title="ลบ" aria-label={`ลบ ${user.name}`}>
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <Pagination page={page} pageCount={pageCount} setPage={setPage} total={total} />

      {editing && (
        <EditorDialog title={`แก้ไขข้อมูล ${editing.name}`} onSave={saveEdit} onClose={() => setEditing(null)} saveDisabled={!editForm.name.trim()}>
          <label className="ui-field">ชื่อ-นามสกุล<input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} /></label>
          <label className="ui-field">เบอร์โทร<input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} placeholder="เบอร์โทร" /></label>
          <label className="ui-field">บทบาท
            <select value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}>
              {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </EditorDialog>
      )}

      {creating && (
        <EditorDialog
          title="สร้างบัญชีเจ้าหน้าที่"
          onSave={createAccount}
          onClose={() => setCreating(null)}
          saveLabel="สร้างบัญชี"
          saveDisabled={!accountForm.name.trim() || !accountForm.email.trim() || accountForm.password.length < 10}
        >
          <label className="ui-field">ประเภทบัญชี
            <select value={accountForm.role} onChange={(e) => setAccount("role", e.target.value)}>
              <option value="counsellor">บุคลากรทางการแพทย์</option>
              <option value="admin">ผู้ดูแลระบบ</option>
            </select>
          </label>
          <div className="editor-dialog-row">
            <label className="ui-field">ชื่อ-นามสกุล<input value={accountForm.name} onChange={(e) => setAccount("name", e.target.value)} required /></label>
            <label className="ui-field">อีเมล<input type="email" value={accountForm.email} onChange={(e) => setAccount("email", e.target.value)} required /></label>
          </div>
          <div className="editor-dialog-row">
            <label className="ui-field">รหัสผ่าน (อย่างน้อย 10 ตัวอักษร)<input type="password" value={accountForm.password} onChange={(e) => setAccount("password", e.target.value)} minLength={10} maxLength={128} autoComplete="new-password" required /></label>
            <label className="ui-field">เบอร์โทร<input value={accountForm.phone} onChange={(e) => setAccount("phone", e.target.value)} /></label>
          </div>
          {accountForm.role === "counsellor" ? (
            <div className="editor-dialog-row">
              <label className="ui-field">ความเชี่ยวชาญ<input value={accountForm.specialization} onChange={(e) => setAccount("specialization", e.target.value)} placeholder="เช่น จิตแพทย์, นักจิตวิทยา" /></label>
              <label className="ui-field">สังกัด<input value={accountForm.hospital} onChange={(e) => setAccount("hospital", e.target.value)} placeholder="เช่น โรงพยาบาลธัญญารักษ์ขอนแก่น" /></label>
            </div>
          ) : (
            <div className="editor-dialog-row">
              <label className="ui-field">ตำแหน่ง<input value={accountForm.position} onChange={(e) => setAccount("position", e.target.value)} placeholder="เช่น ผู้ดูแลระบบ" /></label>
              <label className="ui-field">หน่วยงาน/ฝ่าย<input value={accountForm.department} onChange={(e) => setAccount("department", e.target.value)} /></label>
            </div>
          )}
          <p className="ui-muted">บัญชีที่แอดมินสร้างจะได้รับการยืนยันตัวตนทันที แจ้งรหัสผ่านให้เจ้าของบัญชีและแนะนำให้เปลี่ยนรหัสผ่านที่หน้าโปรไฟล์หลังเข้าสู่ระบบ</p>
        </EditorDialog>
      )}
    </div>
  );
}

export default Users;
